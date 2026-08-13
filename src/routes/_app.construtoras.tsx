import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { useHeaderSearch } from "@/lib/header-search";
import { TableSortSelect } from "@/components/table-sort-select";
import {
  DEFAULT_TABLE_SORT,
  sortByTableOrder,
  type TableSort,
} from "@/lib/table-sort";
import {
  fetchEmpreendimentos,
  updateEmpreendimento,
  type Empreendimento,
} from "@/lib/empreendimentos-api";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CONSTRUTORA_CORES_PRESET,
  construtoraBadgeStyle,
  createConstrutora,
  deleteConstrutora,
  fetchConstrutoras,
  updateConstrutora,
  type Construtora,
} from "@/lib/construtoras-api";
import {
  createLocalidade,
  fetchLocalidades,
  type Localidade,
} from "@/lib/localidades-api";
import {
  Building,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  Phone,
  MapPin,
  User,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  formatPhone,
  isValidPhone,
  PHONE_INVALID_MESSAGE,
  PHONE_PLACEHOLDER,
} from "@/lib/phone";

export const Route = createFileRoute("/_app/construtoras")({
  head: () => ({ meta: [{ title: "Construtoras — Zone Connection" }] }),
  component: ConstrutorasPage,
});

type FormState = {
  nome: string;
  cor: string;
  contato: string;
  endereco: string;
  viabilizadorNome: string;
  viabilizadorContato: string;
  driveFolderUrl: string;
};

const emptyForm = (): FormState => ({
  nome: "",
  cor: "",
  contato: "",
  endereco: "",
  viabilizadorNome: "",
  viabilizadorContato: "",
  driveFolderUrl: "",
});

function construtoraIniciais(nome: string) {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function uniqueLocalidades(items: Construtora[]) {
  const map = new Map<string, { id: string; nome: string }>();
  for (const item of items) {
    for (const localidade of item.localidades ?? []) {
      map.set(localidade.id, {
        id: localidade.id,
        nome: localidade.nome,
      });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );
}

function ConstrutorasPage() {
  const user = getSession();
  const isAdmin = user?.role === "admin";
  const canManage =
    isAdmin ||
    user?.role === "gerente" ||
    user?.role === "analista" ||
    user?.role === "treinee";
  const canCreate = canManage;

  const [items, setItems] = useState<Construtora[]>([]);
  const [sort, setSort] = useState<TableSort>(DEFAULT_TABLE_SORT);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit" | "view">(
    "create",
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [selectedEmpreendimentos, setSelectedEmpreendimentos] = useState<
    string[]
  >([]);
  const [loadingEmpreendimentos, setLoadingEmpreendimentos] = useState(false);
  const [localidades, setLocalidades] = useState<Localidade[]>([]);
  const [selectedLocalidades, setSelectedLocalidades] = useState<string[]>([]);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);
  const [newLocalidadeNome, setNewLocalidadeNome] = useState("");
  const [savingLocalidade, setSavingLocalidade] = useState(false);
  const [driveFilterLocalidadeId, setDriveFilterLocalidadeId] = useState("");
  const { value: search } = useHeaderSearch("Buscar construtora...");

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchConstrutoras());
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar as construtoras.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    void fetchLocalidades()
      .then(setLocalidades)
      .catch(() => {
        toast.error("Não foi possível carregar as regiões.");
      });
  }, []);

  const searchQuery = search.trim().toLocaleLowerCase("pt-BR");

  const matchingItems = useMemo(() => {
    if (!searchQuery) return items;
    return items.filter((item) =>
      item.nome.toLocaleLowerCase("pt-BR").includes(searchQuery),
    );
  }, [items, searchQuery]);

  const driveLocalidades = useMemo(
    () =>
      uniqueLocalidades(
        matchingItems.filter((item) => Boolean(item.driveFolderUrl?.trim())),
      ),
    [matchingItems],
  );

  const driveHubItems = useMemo(() => {
    return matchingItems.filter((item) => {
      if (!item.driveFolderUrl?.trim()) return false;
      if (!driveFilterLocalidadeId) return true;
      return (item.localidades ?? []).some(
        (localidade) => localidade.id === driveFilterLocalidadeId,
      );
    });
  }, [matchingItems, driveFilterLocalidadeId]);

  const sortedItems = useMemo(
    () =>
      sortByTableOrder(
        matchingItems,
        sort,
        (item) => item.nome,
        (item) => item.createdAt,
      ),
    [matchingItems, sort],
  );

  const sortedDriveItems = useMemo(
    () =>
      sortByTableOrder(
        driveHubItems,
        sort,
        (item) => item.nome,
        (item) => item.createdAt,
      ),
    [driveHubItems, sort],
  );

  useEffect(() => {
    if (
      driveFilterLocalidadeId &&
      !driveLocalidades.some((localidade) => localidade.id === driveFilterLocalidadeId)
    ) {
      setDriveFilterLocalidadeId("");
    }
  }, [driveFilterLocalidadeId, driveLocalidades]);

  const showDriveHub =
    !loading &&
    (driveHubItems.length > 0 || Boolean(driveFilterLocalidadeId));

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadLocalidades(selectedIds: string[] = []) {
    setSelectedLocalidades(selectedIds);
    setLoadingLocalidades(true);
    try {
      setLocalidades(await fetchLocalidades());
    } catch {
      setLocalidades([]);
      toast.error("Não foi possível carregar as localidades.");
    } finally {
      setLoadingLocalidades(false);
    }
  }

  function openCreate() {
    setFormMode("create");
    setEditingId(null);
    setForm(emptyForm());
    setEmpreendimentos([]);
    setSelectedEmpreendimentos([]);
    setNewLocalidadeNome("");
    setOpen(true);
    void loadLocalidades([]);
  }

  function openView(item: Construtora) {
    setFormMode("view");
    setEditingId(item.id);
    setForm({
      nome: item.nome,
      cor: item.cor ?? "",
      contato: item.contato ? formatPhone(item.contato) : "",
      endereco: item.endereco ?? "",
      viabilizadorNome: item.viabilizadorNome ?? "",
      viabilizadorContato: item.viabilizadorContato
        ? formatPhone(item.viabilizadorContato)
        : "",
      driveFolderUrl: item.driveFolderUrl ?? "",
    });
    setNewLocalidadeNome("");
    void loadLocalidades((item.localidades ?? []).map((loc) => loc.id));
    setLoadingEmpreendimentos(true);
    void fetchEmpreendimentos()
      .then((result) => {
        setEmpreendimentos(result);
        setSelectedEmpreendimentos(
          result
            .filter(
              (empreendimento) => empreendimento.construtoraId === item.id,
            )
            .map((empreendimento) => empreendimento.id),
        );
      })
      .catch(() => toast.error("Não foi possível carregar os empreendimentos."))
      .finally(() => setLoadingEmpreendimentos(false));
    setOpen(true);
  }

  function openEdit(item: Construtora) {
    openView(item);
    setFormMode("edit");
  }

  function openDriveFolder(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (formMode === "view") return;
    if (formMode === "create" && !canCreate) return;
    if (formMode === "edit" && !canManage) return;
    if (form.nome.trim().length < 2) {
      toast.error("Informe o nome da construtora.");
      return;
    }

    if (form.contato.trim() && !isValidPhone(form.contato)) {
      toast.error(PHONE_INVALID_MESSAGE);
      return;
    }
    if (
      form.viabilizadorContato.trim() &&
      !isValidPhone(form.viabilizadorContato)
    ) {
      toast.error("Contato do viabilizador inválido. " + PHONE_INVALID_MESSAGE);
      return;
    }

    const driveFolderUrl = form.driveFolderUrl.trim();
    if (driveFolderUrl && !/^https:\/\//i.test(driveFolderUrl)) {
      toast.error("A pasta do Drive deve ser uma URL https válida.");
      return;
    }

    const payload = {
      nome: form.nome.trim(),
      cor: form.cor.trim() || null,
      contato: form.contato.trim() || null,
      endereco: form.endereco.trim() || null,
      viabilizadorNome: form.viabilizadorNome.trim() || null,
      viabilizadorContato: form.viabilizadorContato.trim() || null,
      driveFolderUrl: driveFolderUrl || null,
      localidadeIds: selectedLocalidades,
    };

    setSaving(true);
    try {
      if (formMode === "create") {
        await createConstrutora({
          nome: payload.nome,
          cor: payload.cor,
          contato: payload.contato ?? undefined,
          endereco: payload.endereco ?? undefined,
          viabilizadorNome: payload.viabilizadorNome ?? undefined,
          viabilizadorContato: payload.viabilizadorContato ?? undefined,
          driveFolderUrl: payload.driveFolderUrl,
          localidadeIds: payload.localidadeIds,
        });
        toast.success("Construtora cadastrada.");
      } else if (editingId) {
        await updateConstrutora(editingId, payload);
        const selected = new Set(selectedEmpreendimentos);
        await Promise.all(
          empreendimentos
            .filter(
              (empreendimento) =>
                (selected.has(empreendimento.id) &&
                  empreendimento.construtoraId !== editingId) ||
                (!selected.has(empreendimento.id) &&
                  empreendimento.construtoraId === editingId),
            )
            .map((empreendimento) =>
              updateEmpreendimento(empreendimento.id, {
                construtoraId: selected.has(empreendimento.id)
                  ? editingId
                  : null,
              }),
            ),
        );
        toast.success("Construtora atualizada.");
      }
      setOpen(false);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível salvar.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId || !isAdmin) return;
    try {
      await deleteConstrutora(deleteId);
      toast.success("Construtora excluída.");
      setDeleteId(null);
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    }
  }

  const readOnly =
    formMode === "view" ||
    (formMode === "edit" && !canManage) ||
    (formMode === "create" && !canCreate);

  function toggleLocalidade(id: string, checked: boolean) {
    setSelectedLocalidades((previous) =>
      checked ? [...previous, id] : previous.filter((itemId) => itemId !== id),
    );
  }

  async function handleCreateLocalidade() {
    if (!canManage) return;
    const nome = newLocalidadeNome.trim();
    if (nome.length < 2) {
      toast.error("Informe o nome da localidade.");
      return;
    }
    const already = localidades.find(
      (item) => item.nome.localeCompare(nome, "pt-BR", { sensitivity: "base" }) === 0,
    );
    if (already) {
      setSelectedLocalidades((previous) =>
        previous.includes(already.id) ? previous : [...previous, already.id],
      );
      setNewLocalidadeNome("");
      return;
    }
    setSavingLocalidade(true);
    try {
      const created = await createLocalidade(nome);
      setLocalidades((previous) =>
        [...previous, created].sort((a, b) =>
          a.nome.localeCompare(b.nome, "pt-BR"),
        ),
      );
      setSelectedLocalidades((previous) =>
        previous.includes(created.id) ? previous : [...previous, created.id],
      );
      setNewLocalidadeNome("");
      toast.success("Localidade cadastrada.");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível cadastrar a localidade.",
      );
    } finally {
      setSavingLocalidade(false);
    }
  }

  function toggleEmpreendimento(id: string, checked: boolean) {
    setSelectedEmpreendimentos((previous) =>
      checked ? [...previous, id] : previous.filter((itemId) => itemId !== id),
    );
  }

  return (
    <div>
      <PageHeader
        title="Construtoras"
        description={
          canCreate
            ? "Cadastro de construtoras parceiras."
            : "Consulta de construtoras parceiras."
        }
        actions={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />
              Nova construtora
            </Button>
          ) : undefined
        }
      />

      {showDriveHub ? (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-base">Arquivos no Drive</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Clique na construtora para abrir a pasta no Google Drive.
                </p>
              </div>
              <div className="w-full sm:w-[220px]">
                <Select
                  value={driveFilterLocalidadeId || "__all__"}
                  onValueChange={(value) =>
                    setDriveFilterLocalidadeId(value === "__all__" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as localidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as localidades</SelectItem>
                    {driveLocalidades.map((localidade) => (
                      <SelectItem key={localidade.id} value={localidade.id}>
                        {localidade.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {driveLocalidades.length === 0 ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Vincule localidades nas construtoras para filtrar.
                  </p>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {sortedDriveItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {driveFilterLocalidadeId
                  ? "Nenhuma construtora com pasta do Drive nesta localidade."
                  : "Nenhuma pasta do Drive encontrada."}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {sortedDriveItems.map((item) => {
                  const bg = item.cor || "#079ED4";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openDriveFolder(item.driveFolderUrl!)}
                      className={cn(
                        "group flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card p-4 text-center transition-colors",
                        "hover:border-[#079ED4]/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#079ED4]/35",
                      )}
                      title={`Abrir Drive de ${item.nome}`}
                    >
                      <span
                        className="flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-bold tracking-wide text-white shadow-sm"
                        style={{ backgroundColor: bg }}
                      >
                        {construtoraIniciais(item.nome) || (
                          <FolderOpen className="h-6 w-6" />
                        )}
                      </span>
                      <span className="line-clamp-2 text-sm font-medium text-foreground">
                        {item.nome}
                      </span>
                      {item.localidades && item.localidades.length > 0 ? (
                        <span className="line-clamp-1 text-[11px] text-muted-foreground">
                          {item.localidades.map((loc) => loc.nome).join(", ")}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TableSortSelect value={sort} onChange={setSort} />
      </div>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Carregando…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Building className="w-8 h-8 opacity-40" />
              <p>Nenhuma construtora cadastrada.</p>
            </div>
          ) : matchingItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Building className="w-8 h-8 opacity-40" />
              <p>Nenhuma construtora encontrada.</p>
            </div>
          ) : (
            <Table className="[&_th]:px-4 [&_td]:px-4">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Viabilizador</TableHead>
                  <TableHead>Localidades</TableHead>
                  <TableHead className="text-center">Empreend.</TableHead>
                  <TableHead className="text-center">Docs</TableHead>
                  <TableHead className="w-30" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.cor ? (
                        <Badge
                          variant="secondary"
                          className="border-transparent font-medium"
                          style={construtoraBadgeStyle(item.cor)}
                        >
                          {item.nome}
                        </Badge>
                      ) : (
                        item.nome
                      )}
                    </TableCell>
                    <TableCell>{item.contato || "—"}</TableCell>
                    <TableCell>
                      {item.viabilizadorNome ? (
                        <div className="space-y-0.5">
                          <div>{item.viabilizadorNome}</div>
                          {item.viabilizadorContato && (
                            <div className="text-xs text-muted-foreground">
                              {item.viabilizadorContato}
                            </div>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {item.localidades && item.localidades.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.localidades.map((loc) => (
                            <Badge key={loc.id} variant="secondary">
                              {loc.nome}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {item._count?.empreendimentos ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {item._count?.documentacoes ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openView(item)}
                          title="Ver"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(item)}
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(item.id)}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <FormDialogShell
        open={open}
        onOpenChange={setOpen}
        icon={<Building className="w-5 h-5" />}
        title={
          formMode === "create"
            ? "Nova construtora"
            : formMode === "edit"
              ? "Editar construtora"
              : "Construtora"
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <FormDialogBody>
            <FormSection title="Dados">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={form.nome}
                    onChange={(e) => setField("nome", e.target.value)}
                    disabled={readOnly}
                    required
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="cor">Cor do nome</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      id="cor"
                      type="color"
                      value={form.cor || "#3b82f6"}
                      onChange={(e) => setField("cor", e.target.value)}
                      disabled={readOnly}
                      className="h-10 w-14 cursor-pointer p-1"
                    />
                    <Input
                      value={form.cor}
                      onChange={(e) => setField("cor", e.target.value)}
                      disabled={readOnly}
                      placeholder="#3b82f6"
                      maxLength={7}
                      className="max-w-35 font-mono text-sm"
                    />
                    {!readOnly ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setField("cor", "")}
                      >
                        Limpar
                      </Button>
                    ) : null}
                    {form.nome.trim() && form.cor ? (
                      <Badge
                        variant="secondary"
                        className="border-transparent"
                        style={construtoraBadgeStyle(form.cor)}
                      >
                        {form.nome.trim()}
                      </Badge>
                    ) : null}
                  </div>
                  {!readOnly ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {CONSTRUTORA_CORES_PRESET.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          title={hex}
                          className="h-6 w-6 rounded-md border border-border"
                          style={{ backgroundColor: hex }}
                          onClick={() => setField("cor", hex)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="driveFolderUrl">
                    <span className="inline-flex items-center gap-1">
                      <FolderOpen className="w-3.5 h-3.5" /> Pasta Google Drive
                    </span>
                  </Label>
                  <Input
                    id="driveFolderUrl"
                    type="url"
                    inputMode="url"
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={form.driveFolderUrl}
                    onChange={(e) =>
                      setField("driveFolderUrl", e.target.value)
                    }
                    disabled={readOnly}
                  />
                  <p className="text-xs text-muted-foreground">
                    Link da pasta da construtora no Google Drive. Aparece na
                    grade de arquivos desta página.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contato">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> Contato
                    </span>
                  </Label>
                  <Input
                    id="contato"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={PHONE_PLACEHOLDER}
                    value={form.contato}
                    onChange={(e) =>
                      setField("contato", formatPhone(e.target.value))
                    }
                    disabled={readOnly}
                    maxLength={15}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Endereço
                    </span>
                  </Label>
                  <Input
                    id="endereco"
                    value={form.endereco}
                    onChange={(e) => setField("endereco", e.target.value)}
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="viabilizadorNome">
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Viabilizador
                    </span>
                  </Label>
                  <Input
                    id="viabilizadorNome"
                    value={form.viabilizadorNome}
                    onChange={(e) =>
                      setField("viabilizadorNome", e.target.value)
                    }
                    disabled={readOnly}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="viabilizadorContato">
                    Contato do viabilizador
                  </Label>
                  <Input
                    id="viabilizadorContato"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder={PHONE_PLACEHOLDER}
                    value={form.viabilizadorContato}
                    onChange={(e) =>
                      setField(
                        "viabilizadorContato",
                        formatPhone(e.target.value),
                      )
                    }
                    disabled={readOnly}
                    maxLength={15}
                  />
                </div>
              </div>
            </FormSection>
            <FormSection
              icon={<MapPin className="w-3.5 h-3.5 text-primary" />}
              title="Localidades"
            >
              <p className="mb-3 text-sm text-muted-foreground">
                Vincule as regiões de atuação desta construtora. A mesma
                localidade pode ser usada em várias construtoras.
              </p>
              {canManage && !readOnly && (
                <div className="mb-3 flex flex-wrap gap-2">
                  <Input
                    value={newLocalidadeNome}
                    onChange={(e) => setNewLocalidadeNome(e.target.value)}
                    placeholder="Nova localidade (ex.: Recife)"
                    className="h-9 min-w-50 flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleCreateLocalidade();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    disabled={savingLocalidade}
                    onClick={() => void handleCreateLocalidade()}
                  >
                    {savingLocalidade ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-1 h-4 w-4" />
                    )}
                    Cadastrar região
                  </Button>
                </div>
              )}
              {loadingLocalidades ? (
                <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando localidades…
                </div>
              ) : localidades.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">
                  Nenhuma localidade cadastrada.
                </p>
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
                  {localidades.map((localidade) => {
                    const checked = selectedLocalidades.includes(localidade.id);
                    return (
                      <label
                        key={localidade.id}
                        className="flex cursor-pointer items-center gap-3 rounded px-2 py-2 hover:bg-muted"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) =>
                            toggleLocalidade(localidade.id, value === true)
                          }
                          disabled={readOnly}
                        />
                        <span className="truncate text-sm">{localidade.nome}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </FormSection>
            {formMode !== "create" && (
              <FormSection title="Empreendimentos vinculados">
                <p className="mb-3 text-sm text-muted-foreground">
                  Selecione os empreendimentos desta construtora.
                </p>
                {loadingEmpreendimentos ? (
                  <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando empreendimentos…
                  </div>
                ) : empreendimentos.length === 0 ? (
                  <p className="py-3 text-sm text-muted-foreground">
                    Nenhum empreendimento disponível.
                  </p>
                ) : (
                  <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
                    {empreendimentos.map((empreendimento) => {
                      const checked = selectedEmpreendimentos.includes(
                        empreendimento.id,
                      );
                      return (
                        <label
                          key={empreendimento.id}
                          className="flex cursor-pointer items-center gap-3 rounded px-2 py-2 hover:bg-muted"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) =>
                              toggleEmpreendimento(
                                empreendimento.id,
                                value === true,
                              )
                            }
                            disabled={readOnly}
                          />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm">
                              {empreendimento.nome}
                            </span>
                            {empreendimento.cidade && (
                              <span className="text-xs text-muted-foreground">
                                {empreendimento.cidade}
                              </span>
                            )}
                          </span>
                          {empreendimento.construtora &&
                            empreendimento.construtoraId !== editingId && (
                              <span className="text-xs text-muted-foreground">
                                {empreendimento.construtora.nome}
                              </span>
                            )}
                        </label>
                      );
                    })}
                  </div>
                )}
              </FormSection>
            )}
          </FormDialogBody>
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {readOnly ? "Fechar" : "Cancelar"}
            </Button>
            {!readOnly && (
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Salvar
              </Button>
            )}
          </FormDialogActions>
        </form>
      </FormDialogShell>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir construtora?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Documentações vinculadas
              permanecerão sem construtora.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
