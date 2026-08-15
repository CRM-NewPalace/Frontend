import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  FormDialogActions,
  FormDialogBody,
  FormDialogShell,
  FormSection,
} from "@/components/form-dialog";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { TableSortSelect } from "@/components/table-sort-select";
import {
  DEFAULT_TABLE_SORT,
  sortByTableOrder,
  type TableSort,
} from "@/lib/table-sort";
import {
  createEmpreendimento,
  deleteEmpreendimento,
  deleteEmpreendimentoImagem,
  EMPREENDIMENTO_MAX_IMAGES,
  empreendimentoHasLitoral,
  empreendimentoImagens,
  empreendimentoLocalidadeNome,
  empreendimentoStatusLabel,
  empreendimentoTipoLabel,
  fetchEmpreendimentos,
  updateEmpreendimento,
  uploadEmpreendimentoImagem,
  type Empreendimento,
} from "@/lib/empreendimentos-api";
import { useCatalog } from "@/lib/catalog-store";
import { nextCatalogColor, STATUS_CHIP_CLASS } from "@/lib/catalog-colors";
import type { CatalogItem } from "@/lib/catalog-api";
import { cn } from "@/lib/utils";
import {
  createConstrutora,
  fetchConstrutoras,
  type Construtora,
} from "@/lib/construtoras-api";
import {
  createLocalidade,
  fetchLocalidades,
  type Localidade,
} from "@/lib/localidades-api";
import { CorPicker } from "@/components/cor-picker";
import {
  assertImageFile,
  ImageUploadField,
} from "@/components/image-upload-field";
import {
  Building2,
  Loader2,
  Pencil,
  Plus,
  Bath,
  BedDouble,
  Ruler,
  Trash2,
  MapPin,
  Tag,
  Layers,
  CircleDot,
  CalendarClock,
  StickyNote,
  Palette,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/imoveis")({
  head: () => ({ meta: [{ title: "Imóveis — Zone Connection" }] }),
  component: ImoveisPage,
});

const IMOVEIS_GRADIENT_BTN =
  "border-0 bg-transparent text-white shadow-sm hover:bg-transparent hover:brightness-110";
const IMOVEIS_GRADIENT_STYLE = {
  backgroundImage: "linear-gradient(135deg, #0e6f8a 0%, #079ED4 100%)",
} as const;
const IMOVEIS_SOFT_BTN =
  "border-2 border-[#079ED4]/15 bg-[#079ED4]/5 text-[#053647] hover:bg-[#079ED4]/20 hover:text-[#053647]";
const IMOVEIS_SOFT_BTN_ACTIVE =
  "border-2 border-[#079ED4]/40 bg-[#079ED4]/20 text-[#053647] hover:bg-[#079ED4]/25 hover:text-[#053647]";

type EmpCatalogType =
  | "empreendimento_tipo"
  | "empreendimento_status"
  | "empreendimento_tag";

const EMPREENDIMENTO_CATALOG_TITLES: Record<EmpCatalogType, string> = {
  empreendimento_tipo: "Novo tipo",
  empreendimento_status: "Novo status",
  empreendimento_tag: "Nova tag",
};

const EMPREENDIMENTO_CATALOG_EDIT_TITLES: Record<EmpCatalogType, string> = {
  empreendimento_tipo: "Editar tipo",
  empreendimento_status: "Editar status",
  empreendimento_tag: "Editar tag",
};

const EMPREENDIMENTO_CATALOG_SINGULAR: Record<EmpCatalogType, string> = {
  empreendimento_tipo: "tipo",
  empreendimento_status: "status",
  empreendimento_tag: "tag",
};

function withExtraLabel(labels: string[], extra: string) {
  const value = extra.trim();
  if (!value) return labels;
  if (labels.some((label) => label === value)) return labels;
  return [...labels, value];
}

function withExtraLabels(labels: string[], extras: string[]) {
  let next = labels;
  for (const extra of extras) next = withExtraLabel(next, extra);
  return next;
}

type EmpreendimentoFormTab =
  | "identidade"
  | "localidade"
  | "tipo"
  | "status"
  | "tags"
  | "previsao"
  | "observacao";

type EmpreendimentoForm = {
  nome: string;
  construtoraId: string;
  novaConstrutora: boolean;
  construtoraNome: string;
  localidadeId: string;
  novaLocalidade: boolean;
  localidadeNome: string;
  endereco: string;
  cor: string;
  tipo: string;
  status: string;
  tags: string[];
  previsaoEntrega: string;
  areaM2: string;
  observacao: string;
};

function emptyEmpreendimentoForm(): EmpreendimentoForm {
  return {
    nome: "",
    construtoraId: "",
    novaConstrutora: false,
    construtoraNome: "",
    localidadeId: "",
    novaLocalidade: false,
    localidadeNome: "",
    endereco: "",
    cor: "",
    tipo: "",
    status: "",
    tags: [],
    previsaoEntrega: "",
    areaM2: "",
    observacao: "",
  };
}

function formFromEmpreendimento(item: Empreendimento): EmpreendimentoForm {
  return {
    nome: item.nome,
    construtoraId: item.construtoraId ?? "",
    novaConstrutora: false,
    construtoraNome: "",
    localidadeId: item.localidadeId ?? "",
    novaLocalidade: false,
    localidadeNome: "",
    endereco: item.endereco ?? "",
    cor: item.cor ?? "",
    tipo: item.tipo ?? "",
    status: item.status ?? "",
    tags: item.tags ?? [],
    previsaoEntrega: item.previsaoEntrega?.slice(0, 7) ?? "",
    areaM2: item.areaM2 != null ? String(item.areaM2) : "",
    observacao: item.observacao ?? "",
  };
}

function parseAreaM2(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function formatPrevisao(iso: string | null | undefined) {
  if (!iso) return "";
  const [year, month] = iso.slice(0, 7).split("-");
  if (!year || !month) return iso;
  return `${month}/${year}`;
}

export function ImoveisPage({
  embedded = false,
}: {
  embedded?: boolean;
} = {}) {
  const user = getSession();
  const isAdmin = user?.role === "admin";
  const isAnalista = user?.role === "analista";
  const isTreinee = user?.role === "treinee";
  const canManage =
    isAdmin || user?.role === "gerente" || isAnalista || isTreinee;
  const canCreate = canManage;
  const canDelete = isAdmin || isAnalista;
  const canCreateCatalog = canManage;
  const { catalog, addItem, updateItem, removeItem, colorByLabel } =
    useCatalog();
  const tipoOptions = catalog.empreendimento_tipo;
  const statusOptions = catalog.empreendimento_status;
  const tagOptions = catalog.empreendimento_tag;

  const [items, setItems] = useState<Empreendimento[]>([]);
  const [construtoras, setConstrutoras] = useState<Construtora[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<TableSort>(DEFAULT_TABLE_SORT);
  const [localidade, setLocalidade] = useState("");
  const [quartos, setQuartos] = useState("");
  const [construtoraId, setConstrutoraId] = useState("");
  const [somenteLitoral, setSomenteLitoral] = useState(false);
  const [catalogoLocalidades, setCatalogoLocalidades] = useState<Localidade[]>(
    [],
  );
  const [quickOpen, setQuickOpen] = useState(false);
  const [formTab, setFormTab] = useState<EmpreendimentoFormTab>("identidade");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<EmpreendimentoForm>(emptyEmpreendimentoForm);
  const [quickImages, setQuickImages] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [imageBusy, setImageBusy] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickCatalogOpen, setQuickCatalogOpen] =
    useState<EmpCatalogType | null>(null);
  const [quickCatalogLabel, setQuickCatalogLabel] = useState("");
  const [quickCatalogSaving, setQuickCatalogSaving] = useState(false);
  const [quickCatalogEditing, setQuickCatalogEditing] =
    useState<CatalogItem | null>(null);
  const [catalogDeleteTarget, setCatalogDeleteTarget] =
    useState<CatalogItem | null>(null);
  const [catalogDeleting, setCatalogDeleting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchEmpreendimentos({ ativo: true }));
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar os imóveis.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  function setField<K extends keyof EmpreendimentoForm>(
    key: K,
    value: EmpreendimentoForm[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadCatalogos() {
    try {
      const [listaConstrutoras, listaLocalidades] = await Promise.all([
        fetchConstrutoras(),
        fetchLocalidades(),
      ]);
      setConstrutoras(listaConstrutoras);
      setCatalogoLocalidades(listaLocalidades);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível carregar construtoras e localidades.",
      );
    }
  }

  async function openQuickCreate() {
    setEditingId(null);
    setForm(emptyEmpreendimentoForm());
    setFormTab("identidade");
    resetImageState();
    setQuickOpen(true);
    await loadCatalogos();
  }

  async function openEdit(item: Empreendimento) {
    if (!canManage) return;
    setEditingId(item.id);
    setForm(formFromEmpreendimento(item));
    setFormTab("identidade");
    resetImageState(empreendimentoImagens(item));
    setQuickOpen(true);
    await loadCatalogos();
  }

  function clearPendingImages() {
    pendingPreviews.forEach((url) => URL.revokeObjectURL(url));
    setPendingFiles([]);
    setPendingPreviews([]);
  }

  function resetImageState(images: string[] = []) {
    clearPendingImages();
    setQuickImages(images);
    setImageBusy(false);
  }

  async function handleQuickSave() {
    if (form.nome.trim().length < 2) {
      setFormTab("identidade");
      toast.error("Informe o nome do empreendimento.");
      return;
    }

    let construtoraId = form.construtoraId;
    if (form.novaConstrutora) {
      if (form.construtoraNome.trim().length < 2) {
        setFormTab("identidade");
        toast.error("Informe o nome da nova construtora.");
        return;
      }
    } else if (!construtoraId) {
      setFormTab("identidade");
      toast.error("Selecione a construtora ou crie uma nova.");
      return;
    }

    let localidadeId = form.localidadeId || null;
    if (form.novaLocalidade) {
      if (form.localidadeNome.trim().length < 2) {
        toast.error("Informe o nome da nova localidade.");
        setFormTab("localidade");
        return;
      }
    }

    setQuickSaving(true);
    try {
      if (form.novaConstrutora) {
        const criada = await createConstrutora({
          nome: form.construtoraNome.trim(),
        });
        construtoraId = criada.id;
        setConstrutoras((prev) =>
          [...prev, criada].sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR"),
          ),
        );
      }

      if (form.novaLocalidade) {
        const criada = await createLocalidade(form.localidadeNome.trim());
        localidadeId = criada.id;
        setCatalogoLocalidades((prev) =>
          [...prev, criada].sort((a, b) =>
            a.nome.localeCompare(b.nome, "pt-BR"),
          ),
        );
      }

      const areaM2 = parseAreaM2(form.areaM2);
      const payload = {
        nome: form.nome.trim(),
        construtoraId,
        cor: form.cor.trim() || null,
        localidadeId,
        endereco: form.endereco.trim() || null,
        tipo: form.tipo || null,
        status: form.status || null,
        previsaoEntrega: form.previsaoEntrega || null,
        tags: form.tags,
        observacao: form.observacao.trim() || null,
        areaM2,
      };

      if (editingId) {
        await updateEmpreendimento(editingId, payload);
        toast.success("Empreendimento atualizado.");
      } else {
        const created = await createEmpreendimento({
          nome: payload.nome,
          construtoraId: payload.construtoraId,
          ...(payload.cor ? { cor: payload.cor } : {}),
          ...(payload.localidadeId ? { localidadeId: payload.localidadeId } : {}),
          ...(payload.endereco ? { endereco: payload.endereco } : {}),
          ...(payload.tipo ? { tipo: payload.tipo } : {}),
          ...(payload.status ? { status: payload.status } : {}),
          ...(payload.previsaoEntrega
            ? { previsaoEntrega: payload.previsaoEntrega }
            : {}),
          tags: payload.tags,
          ...(payload.observacao ? { observacao: payload.observacao } : {}),
          ...(payload.areaM2 != null ? { areaM2: payload.areaM2 } : {}),
        });
        try {
          for (const file of pendingFiles) {
            await uploadEmpreendimentoImagem(created.id, file);
          }
        } catch (uploadErr) {
          toast.error(
            uploadErr instanceof ApiError
              ? uploadErr.message
              : "Empreendimento cadastrado, mas a foto não foi enviada.",
          );
          setQuickOpen(false);
          setEditingId(null);
          resetImageState();
          await loadItems();
          return;
        }
        toast.success(
          form.novaConstrutora
            ? "Construtora e empreendimento cadastrados."
            : "Empreendimento cadastrado.",
        );
      }
      setQuickOpen(false);
      setEditingId(null);
      resetImageState();
      await loadItems();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : editingId
            ? "Não foi possível atualizar."
            : "Não foi possível cadastrar.",
      );
    } finally {
      setQuickSaving(false);
    }
  }

  function applyCatalogLabel(
    type: EmpCatalogType,
    label: string,
    previous?: string,
  ) {
    if (type === "empreendimento_tipo") {
      setForm((prev) => ({
        ...prev,
        tipo: previous
          ? prev.tipo === previous
            ? label
            : prev.tipo
          : label,
      }));
      return;
    }
    if (type === "empreendimento_status") {
      setForm((prev) => ({
        ...prev,
        status: previous
          ? prev.status === previous
            ? label
            : prev.status
          : label,
      }));
      return;
    }
    setForm((prev) => {
      if (previous) {
        return {
          ...prev,
          tags: prev.tags.map((tag) => (tag === previous ? label : tag)),
        };
      }
      const exists = prev.tags.some(
        (tag) =>
          tag.toLocaleLowerCase("pt-BR") === label.toLocaleLowerCase("pt-BR"),
      );
      return exists ? prev : { ...prev, tags: [...prev.tags, label] };
    });
  }

  function clearCatalogLabel(type: EmpCatalogType, label: string) {
    if (type === "empreendimento_tipo") {
      setForm((prev) =>
        prev.tipo === label ? { ...prev, tipo: "" } : prev,
      );
      return;
    }
    if (type === "empreendimento_status") {
      setForm((prev) =>
        prev.status === label ? { ...prev, status: "" } : prev,
      );
      return;
    }
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== label),
    }));
  }

  async function saveQuickCatalog() {
    if (!quickCatalogOpen) return;
    const label = quickCatalogLabel.trim();
    if (!label) {
      toast.error("Informe um nome.");
      return;
    }
    setQuickCatalogSaving(true);
    try {
      if (quickCatalogEditing) {
        if (label !== quickCatalogEditing.label) {
          await updateItem(quickCatalogEditing.id, { label });
          applyCatalogLabel(
            quickCatalogOpen,
            label,
            quickCatalogEditing.label,
          );
          await loadItems();
        }
        toast.success(`"${label}" atualizado.`);
      } else {
        const count =
          quickCatalogOpen === "empreendimento_tipo"
            ? tipoOptions.length
            : quickCatalogOpen === "empreendimento_status"
              ? statusOptions.length
              : tagOptions.length;
        await addItem({
          type: quickCatalogOpen,
          label,
          color: nextCatalogColor(count),
        });
        applyCatalogLabel(quickCatalogOpen, label);
        toast.success(`"${label}" adicionado.`);
      }
      setQuickCatalogOpen(null);
      setQuickCatalogEditing(null);
      setQuickCatalogLabel("");
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : quickCatalogEditing
            ? "Não foi possível atualizar."
            : "Não foi possível adicionar.",
      );
    } finally {
      setQuickCatalogSaving(false);
    }
  }

  function openQuickCatalog(type: EmpCatalogType) {
    setQuickCatalogEditing(null);
    setQuickCatalogLabel("");
    setQuickCatalogOpen(type);
  }

  function openEditCatalog(item: CatalogItem) {
    setQuickCatalogEditing(item);
    setQuickCatalogLabel(item.label);
    setQuickCatalogOpen(item.type as EmpCatalogType);
  }

  async function confirmDeleteCatalog() {
    if (!catalogDeleteTarget) return;
    const item = catalogDeleteTarget;
    setCatalogDeleting(true);
    try {
      await removeItem(item.id);
      clearCatalogLabel(item.type as EmpCatalogType, item.label);
      setCatalogDeleteTarget(null);
      await loadItems();
      toast.success(`"${item.label}" excluído da lista.`);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Não foi possível excluir.",
      );
    } finally {
      setCatalogDeleting(false);
    }
  }

  async function handleDelete() {
    if (!deleteId || !canDelete) return;
    setDeleting(true);
    try {
      await deleteEmpreendimento(deleteId);
      setDeleteId(null);
      await loadItems();
      toast.success("Empreendimento excluído.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível excluir.",
      );
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddImages(files: File[]) {
    const valid: File[] = [];
    for (const file of files) {
      const error = assertImageFile(file);
      if (error) {
        toast.error(error);
        return;
      }
      valid.push(file);
    }
    const remaining =
      EMPREENDIMENTO_MAX_IMAGES - quickImages.length - pendingFiles.length;
    const picked = valid.slice(0, Math.max(0, remaining));
    if (picked.length === 0) {
      toast.error("Limite de 2 imagens por empreendimento.");
      return;
    }

    if (editingId) {
      setImageBusy(true);
      try {
        let current: Empreendimento | null = null;
        for (const file of picked) {
          current = await uploadEmpreendimentoImagem(editingId, file);
        }
        if (current) {
          setQuickImages(empreendimentoImagens(current));
          setItems((prev) =>
            prev.map((item) => (item.id === current!.id ? current! : item)),
          );
        }
        toast.success(
          picked.length > 1 ? "Imagens enviadas." : "Imagem enviada.",
        );
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível enviar a imagem.",
        );
      } finally {
        setImageBusy(false);
      }
      return;
    }

    setPendingFiles((prev) => [...prev, ...picked]);
    setPendingPreviews((prev) => [
      ...prev,
      ...picked.map((file) => URL.createObjectURL(file)),
    ]);
  }

  async function handleRemoveImage(index: number) {
    if (index < quickImages.length) {
      if (!editingId) return;
      setImageBusy(true);
      try {
        const current = await deleteEmpreendimentoImagem(editingId, index);
        setQuickImages(empreendimentoImagens(current));
        setItems((prev) =>
          prev.map((item) => (item.id === current.id ? current : item)),
        );
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Não foi possível remover a imagem.",
        );
      } finally {
        setImageBusy(false);
      }
      return;
    }
    const pendingIndex = index - quickImages.length;
    setPendingPreviews((prev) => {
      const url = prev[pendingIndex];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== pendingIndex);
    });
    setPendingFiles((prev) => prev.filter((_, i) => i !== pendingIndex));
  }

  const localidades = useMemo(
    () =>
      [
        ...new Set(
          items
            .map((item) => empreendimentoLocalidadeNome(item))
            .filter((nome): nome is string => Boolean(nome)),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [items],
  );
  const opcoesQuartos = useMemo(
    () =>
      [...new Set(items.flatMap((item) => item.quartos ?? []))].sort(
        (a, b) => a - b,
      ),
    [items],
  );
  const opcoesConstrutoras = useMemo(
    () =>
      Array.from(
        new Map(
          items.flatMap((item) =>
            item.construtora
              ? [[item.construtora.id, item.construtora.nome] as const]
              : [],
          ),
        ),
      )
        .map(([id, nome]) => ({ id, nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [items],
  );
  const hasActiveFilters = Boolean(
    localidade || quartos || construtoraId || somenteLitoral,
  );

  function clearFilters() {
    setSearch("");
    setLocalidade("");
    setQuartos("");
    setConstrutoraId("");
    setSomenteLitoral(false);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return items.filter((item) => {
      const searchable = [
        item.nome,
        empreendimentoLocalidadeNome(item),
        item.endereco ?? "",
        item.construtora?.nome ?? "",
        item.observacao ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      return (
        (!q || searchable.includes(q)) &&
        (!localidade || empreendimentoLocalidadeNome(item) === localidade) &&
        (!quartos || item.quartos === Number(quartos)) &&
        (!construtoraId || item.construtoraId === construtoraId) &&
        (!somenteLitoral || empreendimentoHasLitoral(item))
      );
    });
  }, [items, search, localidade, quartos, construtoraId, somenteLitoral]);

  const sorted = useMemo(
    () =>
      sortByTableOrder(
        filtered,
        sort,
        (item) => item.nome,
        (item) => item.createdAt,
      ),
    [filtered, sort],
  );

  return (
    <div>
      {embedded ? (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Cadastro de imóveis</h2>
            <p className="text-sm text-muted-foreground">
              Empreendimentos desta imobiliária.
            </p>
          </div>
          {canCreate ? (
            <Button
              onClick={() => void openQuickCreate()}
              className={IMOVEIS_GRADIENT_BTN}
              style={IMOVEIS_GRADIENT_STYLE}
            >
              <Plus className="w-4 h-4 mr-1" />
              Novo imóvel
            </Button>
          ) : null}
        </div>
      ) : (
        <PageHeader
          title="Imóveis"
          description="Cadastre e gerencie os empreendimentos desta imobiliária."
          actions={
            canCreate ? (
              <Button
                onClick={() => void openQuickCreate()}
                className={IMOVEIS_GRADIENT_BTN}
                style={IMOVEIS_GRADIENT_STYLE}
              >
                <Plus className="w-4 h-4 mr-1" />
                Novo imóvel
              </Button>
            ) : undefined
          }
        />
      )}

      <div className="mb-4 grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2 xl:grid-cols-6">
        <div className="sm:col-span-2 xl:col-span-1">
          <Label htmlFor="buscar-imovel" className="mb-1.5 block text-xs">
            Buscar
          </Label>
          <Input
            id="buscar-imovel"
            placeholder="Nome ou endereço…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Ordenar</Label>
          <TableSortSelect value={sort} onChange={setSort} className="w-full" />
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Localidade</Label>
          <Select
            value={localidade || "__all__"}
            onValueChange={(value) =>
              setLocalidade(value === "__all__" ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {localidades.map((cidade) => (
                <SelectItem key={cidade} value={cidade}>
                  {cidade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Quartos</Label>
          <Select
            value={quartos || "__all__"}
            onValueChange={(value) =>
              setQuartos(value === "__all__" ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              {opcoesQuartos.map((quantidade) => (
                <SelectItem key={quantidade} value={String(quantidade)}>
                  {quantidade} quarto{quantidade === 1 ? "" : "s"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-xs">Construtora</Label>
          <Select
            value={construtoraId || "__all__"}
            onValueChange={(value) =>
              setConstrutoraId(value === "__all__" ? "" : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas</SelectItem>
              {opcoesConstrutoras.map((construtora) => (
                <SelectItem key={construtora.id} value={construtora.id}>
                  {construtora.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="outline"
            className={`flex-1 ${somenteLitoral ? IMOVEIS_SOFT_BTN_ACTIVE : IMOVEIS_SOFT_BTN}`}
            onClick={() => setSomenteLitoral((current) => !current)}
          >
            Litoral
          </Button>
          {(hasActiveFilters || search) && (
            <Button type="button" variant="ghost" onClick={clearFilters}>
              Limpar
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Carregando…
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Building2 className="w-8 h-8 opacity-40" />
            <p className="text-center max-w-sm">
              {items.length === 0
                ? canCreate
                  ? "Nenhum empreendimento cadastrado. Use “Novo imóvel” para começar."
                  : "Nenhum empreendimento cadastrado ainda."
                : hasActiveFilters
                  ? "Nenhum empreendimento encontrado para os filtros selecionados."
                  : "Nenhum resultado para a busca."}
            </p>
            {items.length === 0 && canCreate && (
              <Button
                className={`mt-2 ${IMOVEIS_GRADIENT_BTN}`}
                style={IMOVEIS_GRADIENT_STYLE}
                onClick={() => void openQuickCreate()}
              >
                <Plus className="w-4 h-4 mr-1" />
                Novo imóvel
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((item) => (
            <Card
              key={item.id}
              className="group overflow-hidden transition-shadow hover:shadow-lg"
            >
              <div className="relative h-40 overflow-hidden bg-linear-to-br from-primary/25 via-primary/10 to-muted">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building2 className="h-10 w-10 text-primary/35" />
                </div>
                {(() => {
                  const covers = empreendimentoImagens(item);
                  if (covers.length === 0) return null;
                  return (
                    <div
                      className={
                        covers.length > 1
                          ? "relative grid h-full grid-cols-2"
                          : "relative h-full"
                      }
                    >
                      {covers.map((src) => (
                        <img
                          key={src}
                          src={src}
                          alt={`Foto do empreendimento ${item.nome}`}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ))}
                    </div>
                  );
                })()}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/60 to-transparent" />
                {empreendimentoLocalidadeNome(item) ? (
                  <Badge className="absolute bottom-3 right-3 border-white/20 bg-black/45 text-white hover:bg-black/55">
                    {empreendimentoLocalidadeNome(item)}
                  </Badge>
                ) : null}
              </div>
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-snug">
                    {item.nome}
                  </CardTitle>
                  {canManage && (
                    <div className="flex shrink-0 gap-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Editar"
                        onClick={() => void openEdit(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {canDelete && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Excluir"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                {item.construtora && (
                  <p className="text-xs text-muted-foreground">
                    {item.construtora.nome}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {item.endereco && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.endereco}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {item.tipo ? (
                    <Badge
                      className={cn(
                        STATUS_CHIP_CLASS,
                        colorByLabel("empreendimento_tipo", item.tipo),
                      )}
                      title={empreendimentoTipoLabel(item.tipo)}
                    >
                      {empreendimentoTipoLabel(item.tipo)}
                    </Badge>
                  ) : null}
                  {item.status ? (
                    <Badge
                      className={cn(
                        STATUS_CHIP_CLASS,
                        colorByLabel("empreendimento_status", item.status),
                      )}
                      title={empreendimentoStatusLabel(item.status)}
                    >
                      {empreendimentoStatusLabel(item.status)}
                    </Badge>
                  ) : null}
                  {(item.tags ?? []).map((tag) => (
                    <Badge
                      key={tag}
                      className={cn(
                        STATUS_CHIP_CLASS,
                        colorByLabel("empreendimento_tag", tag),
                      )}
                      title={tag}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {item.previsaoEntrega ? (
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="w-3.5 h-3.5" />
                      {formatPrevisao(item.previsaoEntrega)}
                    </span>
                  ) : null}
                  {item.quartos != null && (
                    <span className="inline-flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5" />
                      {item.quartos}
                    </span>
                  )}
                  {item.banheiros != null && (
                    <span className="inline-flex items-center gap-1">
                      <Bath className="w-3.5 h-3.5" />
                      {item.banheiros}
                    </span>
                  )}
                  {item.areaM2 != null && (
                    <span className="inline-flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5" />
                      {item.areaM2} m²
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FormDialogShell
        open={quickOpen}
        onOpenChange={(open) => {
          setQuickOpen(open);
          if (!open) {
            setEditingId(null);
            setFormTab("identidade");
            resetImageState();
          }
        }}
        className="max-w-3xl"
        icon={<Building2 className="w-5 h-5" />}
        title={editingId ? "Editar empreendimento" : "Novo empreendimento"}
        description="Preencha cada seção: identidade, localidade, tipo, status, tags, previsão e observação."
        footer={
          <FormDialogActions>
            <Button
              type="button"
              variant="outline"
              onClick={() => setQuickOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={quickSaving}
              onClick={() => void handleQuickSave()}
            >
              {quickSaving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editingId ? "Salvar" : "Cadastrar"}
            </Button>
          </FormDialogActions>
        }
      >
        <FormDialogBody className="bg-muted/40">
          <Tabs
            value={formTab}
            onValueChange={(value) =>
              setFormTab(value as EmpreendimentoFormTab)
            }
          >
            <TabsList className="mb-1 flex h-auto w-full flex-wrap justify-start gap-1 rounded-full bg-muted p-1">
              <TabsTrigger
                value="identidade"
                className="gap-1.5 rounded-full px-3"
              >
                <Palette className="h-3.5 w-3.5" />
                Identidade
              </TabsTrigger>
              <TabsTrigger
                value="localidade"
                className="gap-1.5 rounded-full px-3"
              >
                <MapPin className="h-3.5 w-3.5" />
                Localidade
              </TabsTrigger>
              <TabsTrigger value="tipo" className="gap-1.5 rounded-full px-3">
                <Layers className="h-3.5 w-3.5" />
                Tipo
              </TabsTrigger>
              <TabsTrigger value="status" className="gap-1.5 rounded-full px-3">
                <CircleDot className="h-3.5 w-3.5" />
                Status
              </TabsTrigger>
              <TabsTrigger value="tags" className="gap-1.5 rounded-full px-3">
                <Tag className="h-3.5 w-3.5" />
                Tags
              </TabsTrigger>
              <TabsTrigger
                value="previsao"
                className="gap-1.5 rounded-full px-3"
              >
                <CalendarClock className="h-3.5 w-3.5" />
                Previsão
              </TabsTrigger>
              <TabsTrigger
                value="observacao"
                className="gap-1.5 rounded-full px-3"
              >
                <StickyNote className="h-3.5 w-3.5" />
                Observação
              </TabsTrigger>
            </TabsList>

            <TabsContent value="identidade" className="mt-4">
          <FormSection
            icon={<Palette className="h-4 w-4" />}
            title="Identidade"
            description="Nome, construtora, cor e fotos do empreendimento."
          >
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="imovel-nome">Nome *</Label>
                <Input
                  id="imovel-nome"
                  value={form.nome}
                  onChange={(event) => setField("nome", event.target.value)}
                  placeholder="Ex.: Reserva dos Ipês"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Construtora *</Label>
                <Select
                  value={
                    form.novaConstrutora
                      ? "__new__"
                      : form.construtoraId || "__none__"
                  }
                  onValueChange={(value) => {
                    if (value === "__new__") {
                      setForm((prev) => ({
                        ...prev,
                        novaConstrutora: true,
                        construtoraId: "",
                      }));
                      return;
                    }
                    setForm((prev) => ({
                      ...prev,
                      novaConstrutora: false,
                      construtoraNome: "",
                      construtoraId: value === "__none__" ? "" : value,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione</SelectItem>
                    <SelectItem value="__new__">+ Nova construtora</SelectItem>
                    {construtoras.map((construtora) => (
                      <SelectItem key={construtora.id} value={construtora.id}>
                        {construtora.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.novaConstrutora ? (
                  <Input
                    value={form.construtoraNome}
                    onChange={(event) =>
                      setField("construtoraNome", event.target.value)
                    }
                    placeholder="Nome da construtora"
                    className="mt-2"
                  />
                ) : null}
              </div>
              <CorPicker
                id="imovel-cor"
                value={form.cor}
                onChange={(hex) => setField("cor", hex)}
                previewLabel={form.nome}
              />
              {canManage ? (
                <ImageUploadField
                  images={[...quickImages, ...pendingPreviews]}
                  max={EMPREENDIMENTO_MAX_IMAGES}
                  label="Fotos"
                  hint="Duas imagens por empreendimento (JPG, PNG ou WebP, máx. 5 MB)."
                  slotLabels={["Foto 1", "Foto 2"]}
                  disabled={quickSaving}
                  busy={imageBusy}
                  onAdd={(files) => void handleAddImages(files)}
                  onRemove={(index) => void handleRemoveImage(index)}
                />
              ) : null}
            </div>
          </FormSection>
            </TabsContent>

            <TabsContent value="localidade" className="mt-4">
          <FormSection
            icon={<MapPin className="h-4 w-4" />}
            title="Localidade"
            description="Região de atuação e endereço do empreendimento."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Localidade</Label>
                <Select
                  value={
                    form.novaLocalidade
                      ? "__new__"
                      : form.localidadeId || "__none__"
                  }
                  onValueChange={(value) => {
                    if (value === "__new__") {
                      setForm((prev) => ({
                        ...prev,
                        novaLocalidade: true,
                        localidadeId: "",
                      }));
                      return;
                    }
                    setForm((prev) => ({
                      ...prev,
                      novaLocalidade: false,
                      localidadeNome: "",
                      localidadeId: value === "__none__" ? "" : value,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Selecione</SelectItem>
                    <SelectItem value="__new__">+ Nova localidade</SelectItem>
                    {catalogoLocalidades.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.novaLocalidade ? (
                  <Input
                    value={form.localidadeNome}
                    onChange={(event) =>
                      setField("localidadeNome", event.target.value)
                    }
                    placeholder="Ex.: Recife"
                    className="mt-2"
                  />
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="imovel-endereco">Endereço</Label>
                <Input
                  id="imovel-endereco"
                  value={form.endereco}
                  onChange={(event) => setField("endereco", event.target.value)}
                  placeholder="Bairro, rua ou referência"
                />
              </div>
            </div>
          </FormSection>
            </TabsContent>

            <TabsContent value="tipo" className="mt-4">
          <FormSection
            icon={<Layers className="h-4 w-4" />}
            title="Tipo"
            description="Classificação do produto. Admin, gerente, analista e treinee podem criar, editar e excluir tipos."
          >
            {canCreateCatalog ? (
              <div className="mb-2 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => openQuickCatalog("empreendimento_tipo")}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Nova
                </Button>
              </div>
            ) : null}
            {canCreateCatalog ? (
              <div className="space-y-2">
                {tipoOptions.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2",
                      form.tipo === item.label &&
                        "border-primary/50 bg-primary/5",
                    )}
                  >
                    <button
                      type="button"
                      className="flex-1 text-left text-sm"
                      onClick={() =>
                        setField(
                          "tipo",
                          form.tipo === item.label ? "" : item.label,
                        )
                      }
                    >
                      {item.label}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Editar tipo"
                      onClick={() => openEditCatalog(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      title="Excluir tipo"
                      onClick={() => setCatalogDeleteTarget(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {form.tipo &&
                !tipoOptions.some((item) => item.label === form.tipo) ? (
                  <div className="flex items-center rounded-lg border px-3 py-2 text-sm">
                    {form.tipo}
                  </div>
                ) : null}
              </div>
            ) : (
              <Select
                value={form.tipo || "__none__"}
                onValueChange={(value) =>
                  setField("tipo", value === "__none__" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecione</SelectItem>
                  {withExtraLabel(
                    tipoOptions.map((item) => item.label),
                    form.tipo,
                  ).map((label) => (
                    <SelectItem key={label} value={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {tipoOptions.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {canCreateCatalog
                  ? "Nenhum tipo cadastrado. Use Nova para criar o primeiro."
                  : "Nenhum tipo cadastrado. Peça à gerência em Configurações → Imóveis."}
              </p>
            ) : null}
          </FormSection>
            </TabsContent>

            <TabsContent value="status" className="mt-4">
          <FormSection
            icon={<CircleDot className="h-4 w-4" />}
            title="Status"
            description="Momento da obra ou comercialização. Admin, gerente, analista e treinee podem criar, editar e excluir status."
          >
            {canCreateCatalog ? (
              <div className="mb-2 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => openQuickCatalog("empreendimento_status")}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Novo
                </Button>
              </div>
            ) : null}
            {canCreateCatalog ? (
              <div className="space-y-2">
                {statusOptions.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2",
                      form.status === item.label &&
                        "border-primary/50 bg-primary/5",
                    )}
                  >
                    <button
                      type="button"
                      className="flex-1 text-left text-sm"
                      onClick={() =>
                        setField(
                          "status",
                          form.status === item.label ? "" : item.label,
                        )
                      }
                    >
                      {item.label}
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Editar status"
                      onClick={() => openEditCatalog(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      title="Excluir status"
                      onClick={() => setCatalogDeleteTarget(item)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {form.status &&
                !statusOptions.some((item) => item.label === form.status) ? (
                  <div className="flex items-center rounded-lg border px-3 py-2 text-sm">
                    {form.status}
                  </div>
                ) : null}
              </div>
            ) : (
              <Select
                value={form.status || "__none__"}
                onValueChange={(value) =>
                  setField("status", value === "__none__" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Selecione</SelectItem>
                  {withExtraLabel(
                    statusOptions.map((item) => item.label),
                    form.status,
                  ).map((label) => (
                    <SelectItem key={label} value={label}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {statusOptions.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {canCreateCatalog
                  ? "Nenhum status cadastrado. Use Novo para criar o primeiro."
                  : "Nenhum status cadastrado. Peça à gerência em Configurações → Imóveis."}
              </p>
            ) : null}
          </FormSection>
            </TabsContent>

            <TabsContent value="tags" className="mt-4">
          <FormSection
            icon={<Tag className="h-4 w-4" />}
            title="Tags"
            description="Marcas usadas na busca e na conversa comercial. Admin, gerente, analista e treinee podem criar, editar e excluir tags."
          >
            {canCreateCatalog ? (
              <div className="mb-2 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => openQuickCatalog("empreendimento_tag")}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Nova
                </Button>
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {withExtraLabels(
                tagOptions.map((item) => item.label),
                form.tags,
              ).map((label) => {
                const catalogItem = tagOptions.find(
                  (item) => item.label === label,
                );
                return (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      id={`imovel-tag-${label}`}
                      checked={form.tags.some(
                        (tag) =>
                          tag.toLocaleLowerCase("pt-BR") ===
                          label.toLocaleLowerCase("pt-BR"),
                      )}
                      onCheckedChange={(checked) =>
                        setForm((prev) => {
                          const selected = prev.tags.some(
                            (tag) =>
                              tag.toLocaleLowerCase("pt-BR") ===
                              label.toLocaleLowerCase("pt-BR"),
                          );
                          if (checked === true && !selected) {
                            return { ...prev, tags: [...prev.tags, label] };
                          }
                          if (checked !== true && selected) {
                            return {
                              ...prev,
                              tags: prev.tags.filter(
                                (tag) =>
                                  tag.toLocaleLowerCase("pt-BR") !==
                                  label.toLocaleLowerCase("pt-BR"),
                              ),
                            };
                          }
                          return prev;
                        })
                      }
                    />
                    <label
                      htmlFor={`imovel-tag-${label}`}
                      className="flex-1 cursor-pointer"
                    >
                      {label}
                    </label>
                    {canCreateCatalog && catalogItem ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Editar tag"
                          onClick={() => openEditCatalog(catalogItem)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          title="Excluir tag"
                          onClick={() => setCatalogDeleteTarget(catalogItem)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {tagOptions.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {canCreateCatalog
                  ? "Nenhuma tag cadastrada. Use Nova para criar a primeira."
                  : "Nenhuma tag cadastrada. Peça à gerência em Configurações → Imóveis."}
              </p>
            ) : null}
          </FormSection>
            </TabsContent>

            <TabsContent value="previsao" className="mt-4">
          <FormSection
            icon={<CalendarClock className="h-4 w-4" />}
            title="Previsão e metragem"
            description="Entrega prevista e área do produto."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="imovel-previsao">Previsão de entrega</Label>
                <Input
                  id="imovel-previsao"
                  type="month"
                  value={form.previsaoEntrega}
                  onChange={(event) =>
                    setField("previsaoEntrega", event.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="imovel-area">Metragem (m²)</Label>
                <Input
                  id="imovel-area"
                  inputMode="decimal"
                  value={form.areaM2}
                  onChange={(event) => setField("areaM2", event.target.value)}
                  placeholder="Ex.: 68"
                />
              </div>
            </div>
          </FormSection>
            </TabsContent>

            <TabsContent value="observacao" className="mt-4">
          <FormSection
            icon={<StickyNote className="h-4 w-4" />}
            title="Observação"
            description="Notas internas para o time."
          >
            <Textarea
              id="imovel-observacao"
              value={form.observacao}
              onChange={(event) => setField("observacao", event.target.value)}
              placeholder="Regras da construtora, diferenciais, observações comerciais…"
              rows={4}
              maxLength={2000}
            />
          </FormSection>
            </TabsContent>
          </Tabs>
        </FormDialogBody>
      </FormDialogShell>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir empreendimento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Leads e documentações vinculadas
              ficarão sem empreendimento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={Boolean(quickCatalogOpen)}
        onOpenChange={(open) => {
          if (!open) {
            setQuickCatalogOpen(null);
            setQuickCatalogEditing(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {quickCatalogOpen
                ? quickCatalogEditing
                  ? EMPREENDIMENTO_CATALOG_EDIT_TITLES[quickCatalogOpen]
                  : EMPREENDIMENTO_CATALOG_TITLES[quickCatalogOpen]
                : "Novo item"}
            </DialogTitle>
            <DialogDescription>
              {quickCatalogEditing
                ? "O novo nome vale neste cadastro e nos empreendimentos que já usam este item."
                : "O item fica disponível neste cadastro e em Configurações → Imóveis."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={quickCatalogLabel}
              onChange={(event) => setQuickCatalogLabel(event.target.value)}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void saveQuickCatalog();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuickCatalogOpen(null);
                setQuickCatalogEditing(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={quickCatalogSaving}
              onClick={() => void saveQuickCatalog()}
            >
              {quickCatalogSaving && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              {quickCatalogEditing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(catalogDeleteTarget)}
        onOpenChange={(open) => {
          if (!open && !catalogDeleting) setCatalogDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir{" "}
              {catalogDeleteTarget
                ? EMPREENDIMENTO_CATALOG_SINGULAR[
                    catalogDeleteTarget.type as EmpCatalogType
                  ]
                : "item"}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {catalogDeleteTarget
                ? `"${catalogDeleteTarget.label}" some das listas de cadastro. Empreendimentos que já usam este valor mantêm o texto até serem editados.`
                : "Este item some das listas de cadastro."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={catalogDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={catalogDeleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteCatalog();
              }}
            >
              {catalogDeleting && (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
