# Visual do Neo — 0.3.3

A referência é o GIF fornecido pelo usuário e o código do Pulse na revisão `73e210f10fc98b5e097fd0ee8c021f9965327ebe`. A marca do aplicativo foi substituída por Neo e a logo N em fita preta enviada pelo usuário; os símbolos dos provedores conservam sua atribuição.

## Encaixe e curva

A versão anterior posicionava a janela com uma margem de oito pixels e desenhava uma cápsula. O Neo encosta a superfície na borda da área útil do monitor, com uma parede reta e duas curvas côncavas. O contorno é traduzido de `DockBerthShape`: largura 64, cantos suavizados 26, flare 24 × 38 e controles Bézier 0,55. A alternativa de pontas redondas usa 32 para os cantos e a curva. A opção suavizada usa a superelipse de ordem quatro, amostrada nos mesmos 48 passos do original.

O padding ancorado é 46, ou 54 com pontas redondas. Fora da borda é 22. Os anéis têm diâmetro 36 e traço 4, com números de 13 abaixo e intervalo de 30. O cartão mede 250, com ponta de 20 × 40 e intervalo de oito até a faixa. Os fatores de tamanho são 0,82, 1 e 1,22. A área transparente reserva espaço para o detalhe e sua animação sem mover a faixa.

## Movimento

A mesma superfície se transforma entre o filete de 6 × 96 e a faixa completa. A mola de abertura usa resposta 0,32 e amortecimento 0,86. Os ícones aparecem em 0,18 s, após 0,12 s. Ao sair com o mouse, o recolhimento espera 320 ms. A troca de cartão usa resposta 0,28 e amortecimento 0,84. Seu conteúdo aparece em 0,14 s, após 0,06 s. Os elementos são preservados, animando também os arcos e as barras quando chegam leituras novas.

O botão esquerdo permite arrastar a faixa. Solta, ela vira uma cápsula; ao largá-la perto de uma borda, recupera a curva ancorada. A posição é salva e limitada ao monitor. O movimento reduzido do Windows desativa as transições. A forma nativa da janela acompanha os quadros de animação e inclui o corredor entre anel e cartão, permitindo atravessar o intervalo com o mouse.

## Verificação e limites

Os testes no Windows verificam encaixe nas quatro bordas, geometria intermediária, recolhimento, preservação dos elementos durante hover e a cápsula solta. As capturas e o GIF do Neo usam contas fictícias em perfil isolado, sobre fundo neutro. Os testes de arraste não comprovam todas as combinações de monitores físicos, DPI e entrada de mouse; a posição e as curvas são verificadas por testes de geometria e pela interface em execução.

O Windows conserva sua barra de título e fonte Segoe UI. O Neo reproduz os comportamentos visíveis de faixa e cartões do GIF; não implementa o notch de hardware, Liquid Glass nem os mascotes do Pulse. Os fluxos de conexão e leitores de histórico ainda têm as limitações descritas no README.
