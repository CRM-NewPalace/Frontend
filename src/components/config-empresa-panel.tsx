import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { fetchMe, getSession } from "@/lib/auth";
import {
  fetchTenantCompany,
  updateTenantCompany,
} from "@/lib/tenant-company-api";
import { formatPhone } from "@/lib/phone";
import { formatCpfCnpj } from "@/lib/utils";
import { Building2, Loader2 } from "lucide-react";
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
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível carregar os dados da imobiliária.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    const name = form.name.trim();
    if (name.length < 2) {
      toast.error("Informe o nome da imobiliária.");
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
      toast.success("Dados da imobiliária salvos.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível salvar os dados da imobiliária.",
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
          Carregando dados da imobiliária…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-primary" />
          Dados da imobiliária
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Essas informações alimentam o contrato de intermediação e a
          identificação da imobiliária no CRM.
        </p>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="empresa-nome">Nome da imobiliária</Label>
              <Input
                id="empresa-nome"
                value={form.name}
                disabled={!isAdmin || saving}
                placeholder="Ex.: IMOBILIÁRIA NEW PALACE"
                onChange={(e) => setField("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="empresa-cnpj">CNPJ</Label>
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
            <div className="space-y-2">
              <Label htmlFor="empresa-email">E-mail</Label>
              <Input
                id="empresa-email"
                type="email"
                value={form.email}
                disabled={!isAdmin || saving}
                placeholder="contato@imobiliaria.com"
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
            <p className="text-xs text-muted-foreground">
              Somente o administrador pode editar os dados da imobiliária.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
