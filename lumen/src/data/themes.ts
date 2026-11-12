/* Temas vizinhos (para recomendar) e opções de humor do primeiro acesso */

export const NEAR: Record<string, string[]> = {ansiedade:["paz","descanso","oração"],paz:["descanso","ansiedade","confiança"],descanso:["paz","cuidado"],cuidado:["amor","descanso"],
 coragem:["força","fé"],força:["coragem","esperança"],esperança:["fé","propósito"],propósito:["confiança","esperança"],amor:["graça","cuidado"],
 graça:["amor","fé"],fé:["confiança","esperança"],confiança:["fé","paz"],gratidão:["alegria","amor"],alegria:["gratidão","esperança"],oração:["fé","paz"]};
export const MOODS: [string, string][] = [["Ansioso(a)","ansiedade"],["Cansado(a)","descanso"],["Com medo","coragem"],["Sem forças","força"],["Grato(a)","gratidão"],
 ["Precisando de esperança","esperança"],["Buscando direção","propósito"],["Em paz","paz"],["Sentindo-me sozinho(a)","cuidado"],["Feliz","alegria"]];
