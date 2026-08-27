import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError } from "@/lib/api";
import {
  CAPTACAO_IMOVEL_TIPO_LABEL,
  CAPTACAO_IMOVEL_TIPOS,
} from "@/lib/captacao-api";
import {
  createInteressadoUsado,
  fetchInteressadosUsado,
  formatBrl,
  type InteressadoUsado,
} from "@/lib/imoveis-usados-api";
import { maskMoneyInput, parseOptionalMoneyInput } from "@/lib/money-input";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/imoveis-usados/interessados")({
  component: InteressadosUsadoPage,
});

function InteressadosUsadoPage() {
  const [items, setItems] = useState<InteressadoUsado[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    tipoDesejado: "",
    cidade: "",
    bairros: "",
    precoMin: "",
    precoMax: "",
    quartosMin: "",
    banheirosMin: "",
    vagasMin: "",
    areaMin: "",
  });

  async function load() {
    setLoading(true);
    try {
      setItems(await fetchInteressadosUsado());
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível listar.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await createInteressadoUsado({
        nome: form.nome,
        telefone: form.telefone || undefined,
        email: form.email || undefined,
        tipoDesejado: form.tipoDesejado || undefined,
        cidade: form.cidade || undefined,
        bairros: form.bairros || undefined,
        precoMin: parseOptionalMoneyInput(form.precoMin) ?? undefined,
        precoMax: parseOptionalMoneyInput(form.precoMax) ?? undefined,
        quartosMin: form.quartosMin ? Number(form.quartosMin) : undefined,
        banheirosMin: form.banheirosMin ? Number(form.banheirosMin) : undefined,
        vagasMin: form.vagasMin ? Number(form.vagasMin) : undefined,
        areaMin: form.areaMin ? Number(form.areaMin.replace(",", ".")) : undefined,
      });
      toast.success("Interessado cadastrado.");
      setOpen(false);
      await load();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Não foi possível cadastrar.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Interessados"
        description="Compradores de imóveis usados. O vínculo com cada imóvel fica na venda."
        actions={
          <Button
            size="sm"
            onClick={() => {
              setForm({
                nome: "",
                telefone: "",
                email: "",
                tipoDesejado: "",
                cidade: "",
                bairros: "",
                precoMin: "",
                precoMax: "",
                quartosMin: "",
                banheirosMin: "",
                vagasMin: "",
                areaMin: "",
              });
              setOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Novo interessado
          </Button>
        }
      />
      {loading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Faixa de preço</TableHead>
              <TableHead>Quartos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  Nenhum interessado cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell>{item.cidade || "—"}</TableCell>
                  <TableCell>
                    {item.tipoDesejado
                      ? CAPTACAO_IMOVEL_TIPO_LABEL[item.tipoDesejado]
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {formatBrl(item.precoMin)} — {formatBrl(item.precoMax)}
                  </TableCell>
                  <TableCell>{item.quartosMin ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <form onSubmit={(e) => void handleSave(e)}>
            <DialogHeader>
              <DialogTitle>Novo interessado</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div>
                <Label>Nome</Label>
                <Input
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={form.telefone}
                    onChange={(e) =>
                      setForm({ ...form, telefone: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label>Tipo desejado</Label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.tipoDesejado}
                  onChange={(e) =>
                    setForm({ ...form, tipoDesejado: e.target.value })
                  }
                >
                  <option value="">Qualquer</option>
                  {CAPTACAO_IMOVEL_TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {CAPTACAO_IMOVEL_TIPO_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={form.cidade}
                    onChange={(e) =>
                      setForm({ ...form, cidade: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Bairros</Label>
                  <Input
                    placeholder="Centro, Boa Viagem"
                    value={form.bairros}
                    onChange={(e) =>
                      setForm({ ...form, bairros: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Preço mínimo</Label>
                  <Input
                    inputMode="numeric"
                    value={form.precoMin}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        precoMin: maskMoneyInput(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Preço máximo</Label>
                  <Input
                    inputMode="numeric"
                    value={form.precoMax}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        precoMax: maskMoneyInput(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label>Quartos</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.quartosMin}
                    onChange={(e) =>
                      setForm({ ...form, quartosMin: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Banheiros</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.banheirosMin}
                    onChange={(e) =>
                      setForm({ ...form, banheirosMin: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Vagas</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.vagasMin}
                    onChange={(e) =>
                      setForm({ ...form, vagasMin: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Área mín.</Label>
                  <Input
                    value={form.areaMin}
                    onChange={(e) =>
                      setForm({ ...form, areaMin: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando…" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
