import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { fetchMe, getSession } from "@/lib/auth";
import {
  deleteTenantCompanyLogo,
  fetchTenantCompany,
  updateTenantCompany,
  uploadTenantCompanyLogo,
} from "@/lib/tenant-company-api";
import { formatPhone } from "@/lib/phone";
import { formatCpfCnpj } from "@/lib/utils";
import {
  ImageUploadField,
  assertImageFile,
} from "@/components/image-upload-field";
import { Building2, Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";

type FormState = {
  name: string;
  documento: string;
  creci: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
};

const emptyForm = (): FormState => ({
  name: "",
  documento: "",
  creci: "",
  email: "",
  telefone: "",
  endereco: "",
  cidade: "",
});

export function ConfigEmpresaPanel() {
  const session = getSession();
  const isAdmin = session?.role === "admin";
  const isSolo = session?.tenant?.plano === "solo";
  const [form, setForm] = useState<FormState>(emptyForm);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);

  const copy = useMemo(
    () =>
      isSolo
        ? {
            title: "Meus dados",
            blurb:
              "Essas informações e a logo aparecem nos contratos, propostas e na identificação do seu CRM.",
            nameLabel: "Nome comercial",
            namePlaceholder: "Ex.: João Silva Corretores",
            nameRequired: "Informe o nome comercial.",
            documentoLabel: "CPF ou CNPJ",
            emailPlaceholder: "contato@seuemail.com",
            loadError: "Não foi possível carregar seus dados.",
            loading: "Carregando seus dados…",
            saved: "Dados salvos.",
            saveError: "Não foi possível salvar os dados.",
            readOnly: "Somente o administrador pode editar estes dados.",
          }
        : {
            title: "Dados da imobiliária",
            blurb:
              "Essas informações e a logo alimentam contratos, propostas e a identificação da imobiliária no CRM.",
            nameLabel: "Nome da imobiliária",
            namePlaceholder: "Ex.: IMOBILIÁRIA NEW PALACE",
            nameRequired: "Informe o nome da imobiliária.",
            documentoLabel: "CNPJ",
            emailPlaceholder: "contato@imobiliaria.com",
            loadError: "Não foi possível carregar os dados da imobiliária.",
            loading: "Carregando dados da imobiliária…",
            saved: "Dados da imobiliária salvos.",
            saveError: "Não foi possível salvar os dados da imobiliária.",
            readOnly:
              "Somente o administrador pode editar os dados da imobiliária.",
          },
    [isSolo],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchTenantCompany()
      .then((company) => {
        if (cancelled) return;
        setForm({
          name: company.name ?? "",
          documento: formatCpfCnpj(company.documento ?? ""),
          creci: company.creci ?? "",
          email: company.email ?? "",
          telefone: company.telefone ? formatPhone(company.telefone) : "",
          endereco: company.endereco ?? "",
          cidade: company.cidade ?? "",
        });
        setLogoUrl(company.logoUrl);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(
          err instanceof ApiError ? err.message : copy.loadError,
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [copy.loadError]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function refreshSessionLogo() {
    await fetchMe().catch(() => null);
  }

  async function handleAddLogo(files: File[]) {
    const file = files[0];
    if (!isAdmin || !file) return;
    const invalid = assertImageFile(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setLogoBusy(true);
    try {
      const updated = await uploadTenantCompanyLogo(file);
      setLogoUrl(updated.logoUrl);
      await refreshSessionLogo();
      toast.success("Logo atualizada.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível enviar a logo.",
      );
    } finally {
      setLogoBusy(false);
    }
  }

  async function handleRemoveLogo() {
    if (!isAdmin) return;
    setLogoBusy(true);
    try {
      const updated = await deleteTenantCompanyLogo();
      setLogoUrl(updated.logoUrl);
      await refreshSessionLogo();
      toast.success("Logo removida.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível remover a logo.",
      );
    } finally {
      setLogoBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    const name = form.name.trim();
    if (name.length < 2) {
      toast.error(copy.nameRequired);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateTenantCompany({
        name,
        documento: form.documento,
        creci: form.creci.trim(),
        email: form.email.trim(),
        telefone: form.telefone.trim(),
        endereco: form.endereco.trim(),
        cidade: form.cidade.trim(),
      });
      setForm({
        name: updated.name ?? "",
        documento: formatCpfCnpj(updated.documento ?? ""),
        creci: updated.creci ?? "",
        email: updated.email ?? "",
        telefone: updated.telefone ? formatPhone(updated.telefone) : "",
        endereco: updated.endereco ?? "",
        cidade: updated.cidade ?? "",
      });
      await fetchMe().catch(() => null);
      toast.success(copy.saved);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : copy.saveError,
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {copy.loading}
        </CardContent>
      </Card>
    );
  }

  const TitleIcon = isSolo ? UserRound : Building2;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TitleIcon className="h-4 w-4 text-primary" />
          {copy.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">{copy.blurb}</p>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <ImageUploadField
            images={logoUrl ? [logoUrl] : []}
            max={1}
            label="Logo"
            hint="Aparece no menu, contratos e propostas. JPG, PNG ou WebP, máx. 5 MB."
            recommendedSize="800 × 400"
            disabled={!isAdmin}
            busy={logoBusy}
            shape="logo"
            onAdd={(files) => void handleAddLogo(files)}
            onRemove={() => void handleRemoveLogo()}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="empresa-nome">{copy.nameLabel}</Label>
              <Input
                id="empresa-nome"
                value={form.name}
                disabled={!isAdmin || saving}
                placeholder={copy.namePlaceholder}
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa-cnpj">{copy.documentoLabel}</Label>
              <Input
                id="empresa-cnpj"
                value={form.documento}
                disabled={!isAdmin || saving}
                placeholder="00.000.000/0000-00"
                onChange={(e) =>
                  setField("documento", formatCpfCnpj(e.target.value))
                }
              />
            </div>
            {isSolo ? null : (
              <div className="space-y-2">
                <Label htmlFor="empresa-creci">CRECI</Label>
                <Input
                  id="empresa-creci"
                  value={form.creci}
                  disabled={!isAdmin || saving}
                  placeholder="Ex.: 18937-J"
                  onChange={(e) => setField("creci", e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="empresa-email">E-mail</Label>
              <Input
                id="empresa-email"
                type="email"
                value={form.email}
                disabled={!isAdmin || saving}
                placeholder={copy.emailPlaceholder}
                onChange={(e) => setField("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa-telefone">Telefone</Label>
              <Input
                id="empresa-telefone"
                value={form.telefone}
                disabled={!isAdmin || saving}
                placeholder="(81) 99999-9999"
                onChange={(e) =>
                  setField("telefone", formatPhone(e.target.value))
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="empresa-endereco">Endereço</Label>
              <Input
                id="empresa-endereco"
                value={form.endereco}
                disabled={!isAdmin || saving}
                placeholder="Ex.: AV CAXANGÁ, 5405 — Várzea, Recife-PE"
                onChange={(e) => setField("endereco", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa-cidade">Cidade do contrato</Label>
              <Input
                id="empresa-cidade"
                value={form.cidade}
                disabled={!isAdmin || saving}
                placeholder="Ex.: Recife/PE"
                onChange={(e) => setField("cidade", e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Usada na data/local do contrato de intermediação.
              </p>
            </div>
          </div>

          {isAdmin ? (
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{copy.readOnly}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
