import { Check, Copy, KeyRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function generatePortalTempPassword() {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `Portal1a${hex}`;
}

export function isPortalPasswordStrong(value: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);
}

export function ProprietarioPortalFields({
  senha,
  onSenha,
}: {
  senha: string;
  onSenha: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <KeyRound className="h-4 w-4 text-brand-accent" />
        Acesso ao portal do proprietário
      </div>
      <p className="text-xs text-muted-foreground">
        O e-mail acima e a senha liberam o login em{" "}
        <span className="font-mono">/portal/login</span>.
      </p>
      <Label htmlFor="portal-senha">Senha</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="portal-senha"
          type="text"
          autoComplete="new-password"
          value={senha}
          onChange={(e) => onSenha(e.target.value)}
          placeholder="Defina ou gere uma senha temporária"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => onSenha(generatePortalTempPassword())}
        >
          Gerar senha temporária
        </Button>
      </div>
      {senha && !isPortalPasswordStrong(senha) ? (
        <p className="text-xs text-destructive">
          Mínimo 8 caracteres, com maiúscula, minúscula e número.
        </p>
      ) : null}
    </div>
  );
}

export function ProprietarioPortalCredenciaisDialog({
  open,
  onOpenChange,
  nome,
  email,
  senha,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nome: string;
  email: string;
  senha: string;
}) {
  const [copied, setCopied] = useState<"email" | "senha" | null>(null);

  async function copy(value: string, field: "email" | "senha") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Credenciais do portal</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Anote e entregue a {nome}. A senha só aparece agora.
        </p>
        <div className="grid gap-3">
          <div>
            <Label>E-mail</Label>
            <div className="mt-1 flex gap-2">
              <Input readOnly value={email} />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void copy(email, "email")}
              >
                {copied === "email" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div>
            <Label>Senha temporária</Label>
            <div className="mt-1 flex gap-2">
              <Input readOnly value={senha} className="font-mono" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void copy(senha, "senha")}
              >
                {copied === "senha" ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Entendi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
