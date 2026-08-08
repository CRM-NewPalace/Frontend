import { Link } from "@tanstack/react-router";
import { getWhatsAppUrl } from "@/lib/env";
import { LegalDocument, LegalSection } from "@/marketing/legal/LegalDocument";

const CONTACT_MSG =
  "Olá! Quero falar sobre os Termos de Uso da Zone Connection.";

export default function TermsOfUsePage() {
  return (
    <LegalDocument title="Termos de Uso" updatedAt="7 de agosto de 2026">
      <LegalSection id="aceitacao" title="1. Aceitação">
        <p>
          Ao acessar o site da <strong>Zone Connection</strong>{" "}
          (zoneconnection.com.br) e conteúdos relacionados — incluindo páginas
          de produtos e demonstração — você concorda com estes Termos de Uso e
          com a{" "}
          <Link to="/privacidade">Política de Privacidade</Link>. Se não
          concordar, não utilize o site.
        </p>
      </LegalSection>

      <LegalSection id="servicos" title="2. Sobre os serviços">
        <p>
          A Zone Connection oferece soluções de tecnologia para o mercado
          imobiliário, incluindo, entre outras:
        </p>
        <ul>
          <li>CRM Imobiliário;</li>
          <li>IA para WhatsApp;</li>
          <li>Sites institucionais e landing pages.</li>
        </ul>
        <p>
          Informações comerciais, preços e planos no site são referenciais e
          podem ser alterados. A contratação de produtos ocorre mediante
          proposta, contrato ou aceite específico com condições próprias.
        </p>
      </LegalSection>

      <LegalSection id="uso" title="3. Uso permitido do site">
        <p>Você se compromete a:</p>
        <ul>
          <li>usar o site de forma lícita e de boa-fé;</li>
          <li>
            não tentar obter acesso não autorizado a sistemas, contas ou dados;
          </li>
          <li>
            não interferir no funcionamento do site (ex.: ataques, scraping
            abusivo, engenharia reversa indevida);
          </li>
          <li>
            não utilizar o conteúdo do site para fins ilícitos ou que violem
            direitos de terceiros.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="conta" title="4. Conta e área logada">
        <p>
          Parte dos serviços exige cadastro e autenticação. Você é responsável
          pela veracidade das informações fornecidas e pela guarda de login e
          senha. Atividades realizadas com suas credenciais presumem-se de sua
          responsabilidade, salvo comprovação de falha de segurança imputável à
          Zone Connection.
        </p>
      </LegalSection>

      <LegalSection id="conteudo" title="5. Propriedade intelectual">
        <p>
          Marcas, logos, layout, textos, código, diagramas e demais elementos do
          site são de titularidade da Zone Connection ou de licenciantes.
          É vedada a reprodução, distribuição ou uso comercial sem autorização
          prévia, salvo o necessário para navegação regular.
        </p>
      </LegalSection>

      <LegalSection id="demo" title="6. Demonstração">
        <p>
          A área de demonstração é ilustrativa e pode conter dados fictícios.
          Não constitui garantia de funcionalidade idêntica em produção nem
          proposta vinculante. Disponibilidade e conteúdo da demo podem mudar
          sem aviso prévio.
        </p>
      </LegalSection>

      <LegalSection id="terceiros" title="7. Links e serviços de terceiros">
        <p>
          O site pode conter links para WhatsApp, Instagram, Google Analytics e
          outros serviços de terceiros. Esses serviços possuem termos e
          políticas próprios. A Zone Connection não se responsabiliza pelo
          conteúdo ou práticas de privacidade de sites de terceiros.
        </p>
      </LegalSection>

      <LegalSection id="disponibilidade" title="8. Disponibilidade">
        <p>
          Empregamos esforços razoáveis para manter o site disponível, mas não
          garantimos funcionamento ininterrupto ou livre de erros. Podemos
          suspender, modificar ou descontinuar partes do site para manutenção,
          atualização ou segurança.
        </p>
      </LegalSection>

      <LegalSection id="isencoes" title="9. Limitação de responsabilidade">
        <p>
          Na máxima extensão permitida pela lei, a Zone Connection não se
          responsabiliza por danos indiretos, lucros cessantes ou prejuízos
          decorrentes do uso ou da impossibilidade de uso do site institucional,
          de links externos ou de informações meramente comerciais publicadas
          online. Responsabilidades relativas a produtos contratados regem-se
          pelo contrato específico firmado entre as partes.
        </p>
      </LegalSection>

      <LegalSection id="privacidade" title="10. Privacidade">
        <p>
          O tratamento de dados pessoais, inclusive cookies e Google Analytics,
          está descrito na{" "}
          <Link to="/privacidade">Política de Privacidade</Link>, que integra
          estes Termos.
        </p>
      </LegalSection>

      <LegalSection id="alteracoes" title="11. Alterações">
        <p>
          Podemos atualizar estes Termos a qualquer momento. A versão vigente
          será publicada nesta página com a data de atualização. O uso
          continuado do site após a alteração constitui aceitação da nova
          versão.
        </p>
      </LegalSection>

      <LegalSection id="foro" title="12. Lei aplicável e foro">
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil.
          Fica eleito o foro da comarca do domicílio do consumidor, quando
          aplicável a relação de consumo; nos demais casos, o foro do domicílio
          da Zone Connection, salvo disposição legal em contrário.
        </p>
      </LegalSection>

      <LegalSection id="contato" title="13. Contato">
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
    </LegalDocument>
  );
}
