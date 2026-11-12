// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Música: catálogo de exemplo */

export const ALBUMS=[
 {id:"manha",name:"Manhã",colors:["#F7D9A0","#E58FA6"],tags:["gratidão","alegria","esperança"]},
 {id:"quietude",name:"Quietude",colors:["#9EC5E8","#B49AE0"],tags:["paz","descanso","ansiedade","cuidado"]},
 {id:"coragem",name:"Coragem",colors:["#F2B879","#D9676F"],tags:["coragem","força","confiança"]},
 {id:"noite",name:"Para dormir",colors:["#8E9AD8","#4B4785"],tags:["fé","graça","amor","oração","propósito"]},
 {id:"salmos",name:"Salmos",colors:["#C8DDA9","#5E8C6A"],tags:["confiança","cuidado","paz"]},
 {id:"gratidao",name:"Gratidão",colors:["#F7C9A0","#C97B5A"],tags:["gratidão","alegria"]}];
export const P1=[[0,7,12,16],[-3,4,9,12],[-7,0,5,9],[-5,2,7,11]],P2=[[0,7,12,15],[-4,3,8,12],[3,10,15,19],[-2,5,10,14]],
      P3=[[0,7,11,16],[5,12,16,21]],P4=[[0,7,14,16],[-5,2,9,11],[-3,4,11,12],[-7,0,7,9]];
export const TR=[
 {id:"t1",t:"Novas a cada manhã",al:"manha",key:50,bpm:78,prog:P1,step:.5,dur:186,ref:"Lamentações 3:22-23",ly:["É pelas bondades do SENHOR que não somos consumidos", "porque suas misericórdias não têm fim.", "Elas são novas a cada manhã", "grande é a tua fidelidade."]},
 {id:"t2",t:"Este é o dia",al:"manha",key:55,bpm:84,prog:P4,step:.5,dur:174,ref:"Salmos 118:24",ly:["Este é o dia em que o SENHOR agiu", "alegremos e enchamos de alegria nele."]},
 {id:"t3",t:"Lâmpada",al:"manha",key:52,bpm:72,prog:P3,step:1,dur:198,ref:"Salmos 119:105",ly:["Tua palavra é lâmpada para meus pés e luz para meu caminho."]},
 {id:"t4",t:"Ficai quietos",al:"quietude",key:48,bpm:60,prog:P3,step:1,dur:204,ref:"Salmos 46:10",ly:["Ficai quietos", "e sabei que eu sou Deus", "eu serei exaltado entre as nações", "serei exaltado sobre a terra."]},
 {id:"t5",t:"Águas quietas",al:"quietude",key:53,bpm:64,prog:P1,step:1,dur:192,ref:"Salmos 23:1-2",ly:["O SENHOR é meu pastor", "nada me faltará.", "Ele me faz deitar em pastos verdes", "e me leva a águas quietas."]},
 {id:"t6",t:"Vinde a mim",al:"quietude",key:51,bpm:62,prog:P4,step:1,dur:186,ref:"Mateus 11:28-29",ly:["Vinde a mim todos vós que estais cansados e sobrecarregados", "e eu vos farei descansar.", "Tomai sobre vós o meu jugo e aprendei de mim", "porque sou manso e humilde de coração", "e encontrareis descanso para as vossas almas."]},
 {id:"t7",t:"Asas como águias",al:"coragem",key:50,bpm:90,prog:P2,step:.5,dur:180,ref:"Isaías 40:31",ly:["Mas os que confiam no SENHOR renovarão as forças", "subirão com asas como águias", "correrão", "e não se cansarão", "caminharão", "e não se fatigarão."]},
 {id:"t8",t:"Não temas",al:"coragem",key:45,bpm:86,prog:P2,step:.5,dur:192,ref:"Isaías 41:10",ly:["Não temas", "porque eu estou contigo", "não te assombres", "porque eu sou teu Deus.", "Eu te fortaleço", "te ajudo", "e te sustento com a minha mão direita de justiça."]},
 {id:"t9",t:"Refúgio",al:"coragem",key:47,bpm:80,prog:P1,step:.5,dur:180,ref:"Salmos 46:1-2",ly:["Deus é nosso refúgio e força", "socorro oportuno nas angústias.", "Por isso não temeremos", "ainda que a terra se mova", "e ainda que as montanhas passem ao interior dos mares"]},
 {id:"t10",t:"À sombra do Todo-Poderoso",al:"noite",key:43,bpm:54,prog:P3,step:2,dur:240,ref:"Salmos 91:1-2",ly:["Aquele que mora no esconderijo do Altíssimo", "à sombra do Todo-Poderoso habitará.", "Direi ao SENHOR", "Tu és meu refúgio e minha fortaleza", "Deus meu", "em quem confio."]},
 {id:"t11",t:"Dormirei em paz",al:"noite",key:46,bpm:52,prog:P4,step:2,dur:228,ref:"Salmos 4:8",ly:["Eu deitarei", "e dormirei em paz", "porque só tu", "SENHOR", "me fazes descansar seguro."]},
 {id:"t12",t:"O Senhor te guardará",al:"noite",key:44,bpm:50,prog:P1,step:2,dur:234,ref:"Salmos 121:7-8",ly:["O SENHOR te guardará de todo mal", "ele guardará a tua alma.", "O SENHOR guardará tua saída e tua entrada", "desde agora e para sempre."]},
 {id:"t13",t:"Levanto meus olhos",al:"salmos",key:49,bpm:66,prog:P1,step:1,dur:196,ref:"Salmos 121:1-2",ly:["Levanto meus olhos aos montes.", "De onde virá meu socorro?", "Meu socorro vem do SENHOR", "que fez os céus e a terra."]},
 {id:"t14",t:"Louva, ó minha alma",al:"salmos",key:52,bpm:74,prog:P4,step:.5,dur:182,ref:"Salmos 103:1-2",ly:["Louva ao SENHOR", "ó minha alma", "e que todo o meu interior louve ao seu santo nome.", "Louva ao SENHOR", "ó minha alma", "e não te esqueças de nenhum dos benefícios dele"]},
 {id:"t15",t:"Como a corça",al:"salmos",key:47,bpm:58,prog:P3,step:1,dur:210,ref:"Salmos 42:1",ly:["Assim como a corça geme de desejo pelas correntes de águas", "assim também minha alma geme de desejo por ti", "Deus."]},
 {id:"t16",t:"Tu és escudo",al:"salmos",key:45,bpm:82,prog:P2,step:.5,dur:176,ref:"Salmos 3:3",ly:["Porém tu", "SENHOR", "és escudo para mim", "minha glória", "e o que levanta minha cabeça."]},
 {id:"t17",t:"Os céus declaram",al:"salmos",key:54,bpm:70,prog:P1,step:.5,dur:188,ref:"Salmos 19:1-2",ly:["Os céus declaram a glória de Deus", "e o firmamento anuncia a obra de suas mãos.", "Dia após dia ele fala", "e noite após noite ele mostra sabedoria."]},
 {id:"t18",t:"Ensina-nos a contar",al:"salmos",key:48,bpm:56,prog:P4,step:1,dur:214,ref:"Salmos 90:12",ly:["Ensina-nos a contar nossos dias de tal maneira que alcancemos um coração sábio."]},
 {id:"t19",t:"Ele é bom",al:"gratidao",key:55,bpm:88,prog:P1,step:.5,dur:172,ref:"Salmos 136:1",ly:["Agradecei ao SENHOR", "porque ele é bom", "porque sua bondade dura para sempre."]},
 {id:"t20",t:"Em tudo",al:"gratidao",key:50,bpm:80,prog:P4,step:.5,dur:178,ref:"1 Tessalonicenses 5:18",ly:["Agradecei em tudo", "pois essa é a vontade de Deus em Cristo Jesus para vós mesmos."]},
 {id:"t21",t:"Alegrai-vos",al:"gratidao",key:57,bpm:92,prog:P2,step:.5,dur:168,ref:"Filipenses 4:4-5",ly:["Alegrai-vos sempre no Senhor.", "Volto a dizer", "alegrai-vos.", "A vossa bondade seja conhecida por todas as pessoas.", "Perto está o Senhor."]},
 {id:"t22",t:"Toda boa dádiva",al:"gratidao",key:53,bpm:76,prog:P3,step:.5,dur:190,ref:"Tiago 1:17",ly:["Toda boa dádiva e todo dom perfeito vem do alto", "e desce do Pai das luzes", "em quem não há mudança nem sombra de variação."]},
 {id:"t23",t:"Uma nova canção",al:"gratidao",key:52,bpm:86,prog:P1,step:.5,dur:176,ref:"Salmos 96:1",ly:["Cantai ao SENHOR uma nova canção", "cantai ao SENHOR toda a terra."]},
 {id:"t24",t:"Mesa preparada",al:"gratidao",key:48,bpm:72,prog:P4,step:1,dur:186,ref:"Salmos 23:5",ly:["Tu preparas uma mesa diante de mim à vista de meus adversários", "unges a minha cabeça com azeite", "meu cálice transborda."]}];
export const albumOf=tr=>ALBUMS.find(a=>a.id===tr.al);
export function trackFor(v){const al=ALBUMS.find(a=>a.tags.includes(v.t[0]))||ALBUMS[1],l=TR.filter(t=>t.al===al.id);
  return l[[...v.r].reduce((s,c)=>s+c.charCodeAt(0),0)%l.length]}
export const coverStyle=al=>`--c1:${al.colors[0]};--c2:${al.colors[1]}`;
