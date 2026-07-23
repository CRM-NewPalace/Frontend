import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FUNIL_STAGES } from "@/lib/mock-data";
import { Plus, GripVertical } from "lucide-react";

export const Route = createFileRoute("/_app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Imob CRM" }] }),
  component: Config,
});

const ORIGENS = ["Site", "Facebook Ads", "Google Ads", "Instagram", "WhatsApp", "Indicação", "OLX", "Portal Zap"];
const MOTIVOS = ["Preço acima do orçamento", "Localização", "Financiamento negado", "Escolheu concorrente", "Perdeu interesse"];
const TAGS = ["Quente", "Frio", "VIP", "Retorno", "Investidor", "Primeira compra"];

function Config() {
  return (
    <div>
      <PageHeader title="Configurações" description="Personalize funil, origens, tags e automações." />
      <Tabs defaultValue="funil">
        <TabsList>
          <TabsTrigger value="funil">Funil</TabsTrigger>
          <TabsTrigger value="origens">Origens</TabsTrigger>
          <TabsTrigger value="motivos">Motivos de perda</TabsTrigger>
          <TabsTrigger value="tags">Tags</TabsTrigger>
          <TabsTrigger value="modelos">Modelos</TabsTrigger>
          <TabsTrigger value="automacoes">Automações</TabsTrigger>
        </TabsList>

        <TabsContent value="funil">
          <Card>
            <CardHeader className="flex-row justify-between items-center">
              <CardTitle className="text-base">Etapas do funil</CardTitle>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />Nova etapa</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {FUNIL_STAGES.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/40">
                  <GripVertical className="w-4 h-4 text-muted-foreground" />
                  <Badge className={s.color}>{s.name}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">{s.id}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {[
          { key: "origens", title: "Origens de leads", items: ORIGENS },
          { key: "motivos", title: "Motivos de perda", items: MOTIVOS },
          { key: "tags", title: "Tags", items: TAGS },
        ].map((sec) => (
          <TabsContent key={sec.key} value={sec.key}>
            <Card>
              <CardHeader className="flex-row justify-between items-center">
                <CardTitle className="text-base">{sec.title}</CardTitle>
                <Button size="sm"><Plus className="w-4 h-4 mr-1" />Adicionar</Button>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {sec.items.map((i) => <Badge key={i} variant="outline" className="text-sm py-1 px-3">{i}</Badge>)}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent value="modelos">
          <Card>
            <CardHeader><CardTitle className="text-base">Modelos de mensagem</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {["Boas-vindas WhatsApp", "Follow-up 24h", "Confirmação de visita", "Envio de proposta", "Reengajamento"].map((m) => (
                <div key={m} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="text-sm font-medium">{m}</div>
                    <div className="text-xs text-muted-foreground">Template ativo</div>
                  </div>
                  <Button variant="outline" size="sm">Editar</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automacoes">
          <Card>
            <CardHeader><CardTitle className="text-base">Automações</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Configure gatilhos automáticos: distribuição de leads, envio de WhatsApp em novas etapas, notificações por email, etc.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
