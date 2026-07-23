import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IMOVEIS, brl } from "@/lib/mock-data";
import { Bath, BedDouble, Car, MapPin, Plus, Search, Ruler } from "lucide-react";

export const Route = createFileRoute("/_app/imoveis")({
  head: () => ({ meta: [{ title: "Imóveis — Imob CRM" }] }),
  component: Imoveis,
});

const IMG = [
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&auto=format",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format",
  "https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=600&auto=format",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&auto=format",
];

function statusColor(s: string) {
  switch (s) {
    case "Disponível": return "bg-success/15 text-success border-success/30";
    case "Reservado": return "bg-warning/15 text-warning-foreground border-warning/30";
    case "Vendido": return "bg-primary/15 text-primary border-primary/30";
    default: return "bg-muted text-muted-foreground";
  }
}

function Imoveis() {
  return (
    <div>
      <PageHeader
        title="Imóveis"
        description={`${IMOVEIS.length} imóveis cadastrados`}
        actions={<Button size="sm"><Plus className="w-4 h-4 mr-1" />Novo imóvel</Button>}
      />

      <Card className="mb-4">
        <CardContent className="p-3 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por código, bairro, título..." className="pl-9 h-9" />
          </div>
          <Select defaultValue="all"><SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos tipos</SelectItem><SelectItem value="ap">Apartamento</SelectItem><SelectItem value="casa">Casa</SelectItem></SelectContent>
          </Select>
          <Select defaultValue="all"><SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas finalidades</SelectItem><SelectItem value="venda">Venda</SelectItem><SelectItem value="locacao">Locação</SelectItem></SelectContent>
          </Select>
          <Select defaultValue="all"><SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos status</SelectItem><SelectItem value="disp">Disponível</SelectItem><SelectItem value="res">Reservado</SelectItem></SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {IMOVEIS.map((im, i) => (
          <Card key={im.id} className="overflow-hidden group cursor-pointer pt-0">
            <div className="relative h-40 bg-muted overflow-hidden">
              <img src={IMG[i % IMG.length]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <Badge className={`absolute top-2 left-2 border ${statusColor(im.status)}`}>{im.status}</Badge>
              <Badge variant="secondary" className="absolute top-2 right-2 bg-black/60 text-white border-0">{im.finalidade}</Badge>
            </div>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{im.codigo} • {im.tipo}</div>
              <div className="text-sm font-medium mt-1 line-clamp-2 min-h-10">{im.titulo}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
                <MapPin className="w-3 h-3" />{im.bairro}, {im.cidade}
              </div>
              <div className="text-lg font-semibold text-primary mt-2">
                {brl(im.valor)}{im.finalidade === "Locação" && <span className="text-xs font-normal text-muted-foreground">/mês</span>}
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />{im.area}m²</span>
                <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" />{im.quartos}</span>
                <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{im.banheiros}</span>
                <span className="flex items-center gap-1"><Car className="w-3 h-3" />{im.garagem}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
