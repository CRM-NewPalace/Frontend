import { Link } from "@tanstack/react-router";
import { getWhatsAppUrl } from "@/lib/env";
import { LegalDocument, LegalSection } from "@/marketing/legal/LegalDocument";

const CONTACT_MSG =
  "Olá! Quero falar sobre privacidade e proteção de dados na Zone Connection.";

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument title="Política de Privacidade" updatedAt="22 de agosto de 2026">
      <LegalSection id="introducao" title="1. Introdução">
        <p>
          Esta Política de Privacidade descreve como a{" "}
          <strong>Zone Connection</strong> (“nós”, “nosso” ou “Controladora”)
          coleta, usa, armazena e protege dados pessoais quando você acessa o
          site{" "}
          <a href="https://zoneconnection.com.br">zoneconnection.com.br</a>,
          páginas de produtos, demonstração e demais canais digitais
          relacionados.
        </p>
        <p>
          O tratamento observa a Lei Geral de Proteção de Dados (Lei nº
          13.709/2018 — LGPD) e demais normas aplicáveis no Brasil.
        </p>
      </LegalSection>

      <LegalSection id="controlador" title="2. Quem é o controlador">
        <p>
          O controlador dos dados pessoais tratados neste site é a Zone
          Connection. Para exercer direitos ou esclarecer dúvidas sobre
          privacidade, entre em contato pelos canais indicados na seção 11.
        </p>
      </LegalSection>

      <LegalSection id="dados" title="3. Quais dados coletamos">
        <p>Podemos coletar as seguintes categorias de dados:</p>
        <ul>
          <li>
            <strong>Dados de navegação e dispositivo:</strong> endereço IP
            (parcialmente anonimizado quando aplicável), tipo de navegador,
            sistema operacional, páginas visitadas, tempo de permanência,
            origem do acesso (referrer) e identificadores de cookies.
          </li>
          <li>
            <strong>Dados fornecidos por você:</strong> nome, telefone, e-mail
            e demais informações que você enviar voluntariamente por WhatsApp,
            formulários ou mensagens comerciais.
          </li>
          <li>
            <strong>Dados de conta (área logada):</strong> quando você utiliza
            o CRM ou produtos autenticados, dados de cadastro, uso da
            plataforma e conteúdo operacional tratados conforme o contrato e
            termos do serviço contratado.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="analytics" title="4. Google Analytics e cookies">
        <p>
          Utilizamos o <strong>Google Analytics 4</strong> (Measurement ID{" "}
          <strong>G-9HHXQ8CC3V</strong>) para entender como o site é usado —
          páginas mais visitadas, origem do tráfego e desempenho de conteúdo —
          e melhorar a experiência e as comunicações.
        </p>
        <p>O Google Analytics pode usar cookies e tecnologias similares para:</p>
        <ul>
          <li>distinguir visitantes recorrentes de novos;</li>
          <li>medir sessões, eventos e caminhos de navegação;</li>
          <li>
            agregar estatísticas de uso (em regra, de forma pseudonimizada).
          </li>
        </ul>
        <p>
          Os dados podem ser processados pela Google LLC / Google Brasil
          conforme as políticas do Google. Consulte também:{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de Privacidade do Google
          </a>{" "}
          e{" "}
          <a
            href="https://policies.google.com/technologies/partner-sites"
            target="_blank"
            rel="noopener noreferrer"
          >
            Como o Google usa informações de sites
          </a>
          .
        </p>
        <p>
          No primeiro acesso, exibimos um banner para você{" "}
          <strong>Aceitar</strong> ou <strong>Recusar</strong> cookies de
          analytics. O Google Analytics só é carregado se houver aceite. A
          escolha fica salva no navegador. Você também pode limpar os dados do
          site nas configurações do navegador para ver o banner novamente, ou
          usar o complemento de desativação do Google Analytics.
        </p>
        <h3>4.1. Base legal</h3>
        <p>
          O uso de analytics para melhoria do site e métricas de audiência
          fundamenta-se, conforme o caso, no legítimo interesse (art. 7º, IX, da
          LGPD) e/ou no consentimento, quando exigido para cookies não
          essenciais.
        </p>
      </LegalSection>

      <LegalSection id="finalidades" title="5. Para que usamos os dados">
        <ul>
          <li>operar, manter e melhorar o site e os produtos;</li>
          <li>responder solicitações comerciais e de suporte;</li>
          <li>medir audiência, campanhas e desempenho de páginas;</li>
          <li>cumprir obrigações legais e prevenir fraudes/abusos;</li>
          <li>
            executar contratos de CRM, IA para WhatsApp, sites e demais
            serviços, quando aplicável.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="compartilhamento" title="6. Compartilhamento">
        <p>Podemos compartilhar dados com:</p>
        <ul>
          <li>
            <strong>Prestadores de tecnologia</strong> (hospedagem, e-mail,
            analytics, infraestrutura), sob obrigações de confidencialidade e
            segurança;
          </li>
          <li>
            <strong>Google</strong>, na qualidade de operador/tecnologia de
            analytics e, quando você conecta o Google Agenda no CRM, para
            sincronizar compromissos, nos termos desta política;
          </li>
          <li>
            autoridades públicas, quando houver obrigação legal ou ordem
            válida.
          </li>
        </ul>
        <p>Não vendemos dados pessoais.</p>
        <h3>6.1. Google Agenda (OAuth)</h3>
        <p>
          Usuários autenticados no CRM podem, se quiserem, conectar a própria
          conta Google em Configurações → Conexões. Pedimos apenas o escopo{" "}
          <code>calendar.events</code>, além de e-mail para identificar a
          conta. Com isso, criamos, atualizamos e removemos no Google Agenda as
          cópias dos compromissos que o usuário já vê no CRM (visitas, ligações,
          reuniões e tarefas). A sincronização é só do CRM para o Google: não
          importamos nem alteramos eventos que existam apenas no Calendar.
        </p>
        <p>
          O token de acesso fica criptografado e associado à conta do CRM. Não
          usamos dados do Calendar para anúncios, não vendemos esses dados e não
          acessamos outros calendários além do necessário para gravar essas
          cópias. O usuário pode trocar de conta ou desconectar a qualquer
          momento no CRM; também pode revogar o acesso em{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            myaccount.google.com/permissions
          </a>
          . Ao desconectar, paramos de enviar novos eventos; os que já foram
          criados no Google permanecem lá até o usuário apagá-los.
        </p>
      </LegalSection>

      <LegalSection id="retencao" title="7. Retenção">
        <p>
          Mantemos os dados pelo tempo necessário às finalidades descritas, ao
          cumprimento de obrigações legais/contratuais e à defesa de direitos.
          Dados de analytics seguem as configurações de retenção da conta Google
          Analytics e políticas do Google.
        </p>
      </LegalSection>

      <LegalSection id="seguranca" title="8. Segurança">
        <p>
          Adotamos medidas técnicas e organizacionais razoáveis para proteger
          dados pessoais contra acesso não autorizado, perda ou alteração
          indevida. Nenhum sistema é totalmente isento de riscos; pedimos que
          você também proteja suas credenciais de acesso.
        </p>
      </LegalSection>

      <LegalSection id="direitos" title="9. Seus direitos (LGPD)">
        <p>Você pode solicitar, nos termos da LGPD:</p>
        <ul>
          <li>confirmação da existência de tratamento;</li>
          <li>acesso, correção e atualização;</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>portabilidade, quando aplicável;</li>
          <li>informação sobre compartilhamentos;</li>
          <li>revogação de consentimento, quando o tratamento se basear nele;</li>
          <li>oposição a tratamentos baseados em legítimo interesse.</li>
        </ul>
        <p>
          Para exercer esses direitos, use os canais da seção 11. Também é
          possível apresentar reclamação à Autoridade Nacional de Proteção de
          Dados (ANPD).
        </p>
      </LegalSection>

      <LegalSection id="criancas" title="10. Crianças e adolescentes">
        <p>
          O site e os produtos destinam-se a profissionais e empresas do mercado
          imobiliário. Não coletamos intencionalmente dados de crianças. Se
          identificar tratamento indevido, contate-nos para exclusão.
        </p>
      </LegalSection>

      <LegalSection id="contato" title="11. Contato">
        <p>
          Para questões sobre esta Política de Privacidade ou proteção de
          dados:
        </p>
        <ul>
          <li>
            Site:{" "}
            <a href="https://zoneconnection.com.br">zoneconnection.com.br</a>
          </li>
          <li>
            WhatsApp:{" "}
            <a
              href={getWhatsAppUrl(CONTACT_MSG)}
              target="_blank"
              rel="noopener noreferrer"
            >
              falar com a Zone Connection
            </a>
          </li>
          <li>
            Instagram:{" "}
            <a
              href="https://www.instagram.com/zone.connection/"
              target="_blank"
              rel="noopener noreferrer"
            >
              @zone.connection
            </a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="alteracoes" title="12. Alterações">
        <p>
          Podemos atualizar esta política para refletir mudanças legais,
          técnicas ou de produto. A data de “Última atualização” será revisada.
          O uso continuado do site após a publicação indica ciência da versão
          vigente. Consulte também os{" "}
          <Link to="/termos">Termos de Uso</Link>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
