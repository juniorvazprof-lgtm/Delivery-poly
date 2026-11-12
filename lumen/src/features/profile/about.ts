// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Aba Você */
import { openSheet } from "../../ui/sheet";

export function openAboutBible(){
  openSheet(`<h2>Sobre a Bíblia</h2><p class="sub">De onde vêm os textos bíblicos do Lumen.</p>
   <div class="about-b"><div class="label">Bíblia utilizada</div>
    <p><b>Bíblia Livre (BLIVRE)</b>, edição de 2018. Atualização para o português do Brasil da tradução de João Ferreira de Almeida de 1819, a partir do Textus Receptus.</p>
    <p>© Diego Santos, Mario Sérgio e Marco Teles. Licença Creative Commons Atribuição 4.0 Brasil, que permite o uso com o devido crédito.</p>
    <div class="label">Onde o texto aparece</div>
    <p>Todos os versículos do feed, a leitura dos capítulos, as passagens do Púlpito e as letras das músicas de exemplo vêm desta Bíblia. As explicações, orações, comentários e o restante dos textos do Púlpito foram escritos pela equipe do Lumen.</p>
    <div class="label">Arquivo de origem</div>
    <p>Texto obtido do repositório público <b>damarals/biblias</b> no GitHub (arquivo BLIVRE.json).</p>
    <div class="label">Ajustes feitos</div>
    <ul><li>Correção de espaços, pontuação e erros de digitação da origem, como no Salmo 34:18 e em Provérbios 3:6.</li>
     <li>Salmo 46: separação dos versículos 2 e 3, que vieram unidos.</li>
     <li>Salmo 119: retirada dos nomes das letras hebraicas no início dos versículos.</li>
     <li>15 versículos ausentes no arquivo de origem, como Mateus 17:21 e Atos 8:37, foram completados com a Almeida de 1911 (domínio público), com ortografia atualizada.</li>
     <li>No feed, a primeira letra fica maiúscula e a pontuação final é ajustada, porque o versículo aparece sozinho na tela.</li></ul>
    <p class="fine" style="text-align:left">Encontrou algum erro no texto? Avise pela página do app na loja.</p></div>`,"Sobre a Bíblia")}
