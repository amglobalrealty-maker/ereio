/* =================================================================
   ereio.co — comportamento das duas páginas

   Um arquivo só, pelo mesmo motivo do estilo: cópia entre páginas
   diverge sem ninguém perceber.

   Regra de ouro daqui: a animação é ACABAMENTO, nunca condição de
   ler a página. Sem script, sem observador ou com movimento
   reduzido, tudo chega visível.
   ================================================================= */
(function () {
  'use strict';

  document.body.classList.remove('sem-js');

  var reduzido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var alvos = document.querySelectorAll('.sobe');
  var i;

  function contar(el) {
    var destino = parseInt(el.getAttribute('data-conta'), 10);
    var sufixo = el.getAttribute('data-sufixo') || '';
    if (!destino) return;
    if (reduzido) { el.textContent = destino.toLocaleString('pt-BR') + sufixo; return; }

    var inicio = null;
    var duracao = 1100;
    function passo(agora) {
      if (inicio === null) inicio = agora;
      var t = Math.min((agora - inicio) / duracao, 1);
      // desacelera no fim: o número assenta em vez de parar seco
      var e = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(destino * e).toLocaleString('pt-BR') + (t === 1 ? sufixo : '');
      if (t < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  function revelar(el) {
    el.classList.add('vista');
    var n = el.matches('[data-conta]') ? [el] : el.querySelectorAll('[data-conta]');
    for (var k = 0; k < n.length; k++) contar(n[k]);
  }

  if (reduzido || typeof IntersectionObserver !== 'function') {
    for (i = 0; i < alvos.length; i++) revelar(alvos[i]);
  } else {
    var observador = new IntersectionObserver(function (registros) {
      for (var j = 0; j < registros.length; j++) {
        if (!registros[j].isIntersecting) continue;
        revelar(registros[j].target);
        observador.unobserve(registros[j].target);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.1 });

    for (i = 0; i < alvos.length; i++) observador.observe(alvos[i]);

    // a abertura não espera rolagem: ela já está na tela
    var naAbertura = document.querySelectorAll('.abertura .sobe');
    for (i = 0; i < naAbertura.length; i++) {
      (function (el, atraso) {
        setTimeout(function () { revelar(el); observador.unobserve(el); }, atraso);
      })(naAbertura[i], 80 + i * 120);
    }
  }

  // um elemento dentro de uma frente fechada não está à vista: carrossel ali
  // não roda. Fora de qualquer frente (na home, por exemplo), conta como aberto.
  function frenteAberta(el) {
    var g = el.closest ? el.closest('.grupo') : null;
    return !g || g.classList.contains('aberto');
  }

  /* ------------------------- o carrossel de telas -------------------------

     Mesma mecânica do carrossel da AMGlobal: o script só escreve `data-pos`
     em cada tela e o CSS faz todo o resto. Zero é a do meio, 1 a da direita,
     -1 a da esquerda, 2 e -2 as de fora; o resto fica escondido.

     Funciona com mais de um carrossel na mesma página, porque cada palco
     guarda o próprio estado. */
  var palcos = document.querySelectorAll('[data-carrossel]');

  Array.prototype.forEach.call(palcos, function (palco) {
    var telas = palco.querySelectorAll('.tela');
    var quantas = telas.length;
    if (!quantas) return;

    var atual = 0;
    var relogio = null;
    var ESPERA = 4600;

    var legenda = palco.querySelector('[data-legenda]');
    var contagem = palco.querySelector('[data-contagem]');
    var pontos = palco.querySelectorAll('[data-ponto]');

    // a metade de trás da roda aparece do lado esquerdo, com sinal negativo
    function relativa(i) {
      var d = (i - atual + quantas) % quantas;
      return d > quantas / 2 ? d - quantas : d;
    }

    function mostrar(i) {
      atual = (i + quantas) % quantas;
      Array.prototype.forEach.call(telas, function (t, k) {
        var p = relativa(k);
        t.setAttribute('data-pos', String(p));
        // só a tela do meio recebe o foco do teclado: as outras não são leitura
        t.setAttribute('tabindex', p === 0 ? '0' : '-1');
        t.setAttribute('aria-hidden', p === 0 ? 'false' : 'true');
      });
      if (legenda) legenda.textContent = telas[atual].getAttribute('data-rotulo') || '';
      if (contagem) contagem.textContent = (atual + 1) + ' / ' + quantas;
      Array.prototype.forEach.call(pontos, function (b, k) {
        b.setAttribute('aria-current', k === atual ? 'true' : 'false');
      });
    }

    function agendar() {
      if (reduzido) return;
      window.clearInterval(relogio);
      relogio = window.setInterval(function () { mostrar(atual + 1); }, ESPERA);
    }

    function parar() { window.clearInterval(relogio); }

    // clicar numa tela lateral traz ela para o meio, e para o rodízio:
    // a pessoa assumiu o controle
    palco.addEventListener('click', function (ev) {
      var alvo = ev.target.closest ? ev.target.closest('.tela') : null;
      if (alvo) {
        mostrar(Array.prototype.indexOf.call(telas, alvo));
        parar();
        return;
      }
      var seta = ev.target.closest ? ev.target.closest('[data-seta]') : null;
      if (seta) {
        mostrar(atual + (seta.getAttribute('data-seta') === 'dir' ? 1 : -1));
        parar();
        return;
      }
      var ponto = ev.target.closest ? ev.target.closest('[data-ponto]') : null;
      if (ponto) {
        mostrar(parseInt(ponto.getAttribute('data-ponto'), 10));
        parar();
      }
    });

    palco.addEventListener('keydown', function (ev) {
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
      ev.preventDefault();
      mostrar(atual + (ev.key === 'ArrowRight' ? 1 : -1));
      parar();
    });

    // o rodízio para enquanto o mouse está em cima: ninguém gosta de ler
    // uma coisa que se mexe sozinha
    palco.addEventListener('mouseenter', parar);
    palco.addEventListener('mouseleave', agendar);

    mostrar(0);

    // guardo o controle no próprio elemento: a lista que abre precisa
    // ligar e desligar o rodízio quando o trabalho abre e fecha
    palco.controleCarrossel = { agendar: agendar, parar: parar };

    // carrossel dentro de um trabalho fechado, ou de uma frente fechada,
    // não roda: seria trabalho de pintura para ninguém ver
    var dentroDeItem = palco.closest ? palco.closest('.item') : null;
    function aVista() {
      return (!dentroDeItem || dentroDeItem.classList.contains('aberto')) && frenteAberta(palco);
    }
    if (aVista()) agendar();

    // não gastar bateria com a aba escondida
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) parar();
      else if (aVista()) agendar();
    });
  });

  /* --------------------- a lista de trabalhos que abre ---------------------

     Um trabalho por linha; clicar abre o detalhe. Abre um de cada vez: com
     vários abertos a pessoa perde a noção do tamanho da lista.

     Sem script, quem abre tudo é a regra dentro do <noscript> da página:
     o conteúdo nunca fica preso atrás do JavaScript. Fazer isso pelo
     <noscript> e não por classe no body evita o pulo da página, que é o
     que aconteceria se tudo abrisse e depois fechasse ao script carregar. */
  var listas = document.querySelectorAll('[data-lista-trabalhos]');

  Array.prototype.forEach.call(listas, function (lista) {
    var itens = lista.querySelectorAll('.item');

    function definir(item, abrir) {
      item.classList.toggle('aberto', abrir);
      var cabeca = item.querySelector('.item-cabeca');
      if (cabeca) cabeca.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      var palco = item.querySelector('[data-carrossel]');
      if (palco && palco.controleCarrossel) {
        if (abrir && frenteAberta(item)) palco.controleCarrossel.agendar();
        else palco.controleCarrossel.parar();
      }
    }

    // o primeiro fica aberto; os outros fecham agora, e não no HTML
    Array.prototype.forEach.call(itens, function (item, i) { definir(item, i === 0); });

    lista.addEventListener('click', function (ev) {
      var cabeca = ev.target.closest ? ev.target.closest('.item-cabeca') : null;
      if (!cabeca) return;
      var item = cabeca.closest('.item');
      var abrindo = !item.classList.contains('aberto');
      Array.prototype.forEach.call(itens, function (outro) {
        definir(outro, outro === item && abrindo);
      });
      // a prévia que segue o cursor some no clique: o trabalho aberto já
      // mostra o carrossel, e ela ficaria flutuando por cima do texto até
      // o mouse se mexer de novo
      var pv = document.querySelector('[data-previa]');
      if (pv) pv.classList.remove('vendo');
    });
  });

  /* ------------------- o painel que desliza pela direita -------------------

     O gatilho de três pontos abre uma gaveta na lateral, com um véu atrás.
     Igual no computador e no celular: não existe um menu que some em tela
     estreita.

     O `hidden` sai ANTES da classe que anima, e volta SÓ depois que a
     transição termina — senão o navegador pula a animação (não dá para
     animar a partir de display:none) e, ao fechar, a gaveta sumiria antes
     de terminar de sair. */
  var gatilho = document.querySelector('[data-gatilho]');
  var painel = document.getElementById('menu');
  var veu = document.querySelector('[data-veu]');

  if (gatilho && painel) {
    var aberto = false;
    var tempoFechar = null;

    function abrirPainel() {
      window.clearTimeout(tempoFechar);
      aberto = true;
      painel.hidden = false;
      if (veu) veu.hidden = false;
      // força o navegador a assumir o estado fechado antes de animar
      void painel.offsetWidth;
      painel.classList.add('aberta');
      if (veu) veu.classList.add('aberta');
      gatilho.setAttribute('aria-expanded', 'true');
      document.body.classList.add('travada');
      var primeiro = painel.querySelector('a, button');
      if (primeiro) primeiro.focus();
    }

    function fecharPainel(devolverFoco) {
      aberto = false;
      painel.classList.remove('aberta');
      if (veu) veu.classList.remove('aberta');
      gatilho.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('travada');
      if (devolverFoco) gatilho.focus();
      tempoFechar = window.setTimeout(function () {
        painel.hidden = true;
        if (veu) veu.hidden = true;
      }, 650);
    }

    gatilho.addEventListener('click', function () {
      if (aberto) fecharPainel(true); else abrirPainel();
    });

    // clicar num link fecha: sem isso, ir para uma âncora da mesma página
    // deixaria a gaveta tapando o destino
    painel.addEventListener('click', function (ev) {
      if (ev.target.closest && ev.target.closest('a')) fecharPainel(false);
    });

    if (veu) veu.addEventListener('click', function () { fecharPainel(true); });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && aberto) fecharPainel(true);
    });
  }

  /* ---------------------------- as frentes ----------------------------

     Sites, automações e sistemas, key visual e logos: quatro frentes, uma
     aberta de cada vez, e dentro de cada uma a lista que abre um por um.
     Abrir uma frente liga o carrossel do trabalho que estiver aberto nela;
     fechar desliga todos os dela. */
  var caixaFrentes = document.querySelector('[data-grupos]');

  if (caixaFrentes) {
    var frentes = caixaFrentes.querySelectorAll('.grupo');

    function definirFrente(grupo, abrir) {
      grupo.classList.toggle('aberto', abrir);
      var cabeca = grupo.querySelector('.grupo-cabeca');
      if (cabeca) cabeca.setAttribute('aria-expanded', abrir ? 'true' : 'false');
      var palcos = grupo.querySelectorAll('[data-carrossel]');
      Array.prototype.forEach.call(palcos, function (palco) {
        if (!palco.controleCarrossel) return;
        var item = palco.closest('.item');
        if (abrir && item && item.classList.contains('aberto')) palco.controleCarrossel.agendar();
        else palco.controleCarrossel.parar();
      });
    }

    // a primeira nasce aberta; as outras fecham aqui, pelo mesmo motivo
    // dos trabalhos. Se o endereço traz a âncora de uma frente
    // (trabalhos.html#g-logos, vindo do rodapé), essa é a que abre.
    function frentePeloEndereco() {
      var alvo = null;
      try { alvo = location.hash.length > 1 ? document.querySelector(location.hash) : null; } catch (e) { alvo = null; }
      return alvo && alvo.closest ? alvo.closest('.grupo') : null;
    }
    var inicial = frentePeloEndereco() || frentes[0];
    Array.prototype.forEach.call(frentes, function (g) { definirFrente(g, g === inicial); });

    window.addEventListener('hashchange', function () {
      var g = frentePeloEndereco();
      if (!g) return;
      Array.prototype.forEach.call(frentes, function (outra) { definirFrente(outra, outra === g); });
    });

    caixaFrentes.addEventListener('click', function (ev) {
      var cabeca = ev.target.closest ? ev.target.closest('.grupo-cabeca') : null;
      if (!cabeca) return;
      var grupo = cabeca.closest('.grupo');
      var abrindo = !grupo.classList.contains('aberto');
      Array.prototype.forEach.call(frentes, function (outra) {
        definirFrente(outra, outra === grupo && abrindo);
      });
      // a frente de cima acabou de fechar e a página encolheu: a que abriu
      // sobe para o topo da tela, senão a pessoa fica olhando um vazio
      if (abrindo && !reduzido && grupo.scrollIntoView) {
        grupo.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      var pv = document.querySelector('[data-previa]');
      if (pv) pv.classList.remove('vendo');
    });
  }

  /* ----------------- a prévia que segue o cursor na lista -----------------

     Num site que vende SITE, uma lista de nomes sem imagem não mostra nada.
     Passar o mouse num nome faz a tela daquele trabalho flutuar junto do
     cursor.

     A posição é perseguida com amortecimento (cada quadro anda um pedaço
     da distância que falta): seguir o cursor na régua exata fica duro e
     parece defeito. E a conta roda num quadro só, não a cada movimento do
     mouse, senão o navegador reposiciona dezenas de vezes por segundo. */
  // a prévia escuta a caixa das frentes (que contém as quatro listas); sem
  // frentes, a lista única
  var listaPrevia = document.querySelector('[data-grupos]') || document.querySelector('[data-lista-trabalhos]');
  var previa = document.querySelector('[data-previa]');
  var podeApontar = window.matchMedia && window.matchMedia('(hover: hover)').matches;

  if (listaPrevia && previa && podeApontar && !reduzido) {
    var imgPrevia = previa.querySelector('img');
    var alvoX = 0, alvoY = 0, posX = 0, posY = 0, iniciada = false, rodando = false;

    function quadro() {
      posX += (alvoX - posX) * 0.16;
      posY += (alvoY - posY) * 0.16;
      previa.style.transform = 'translate3d(' + posX + 'px,' + posY + 'px,0)' +
        ' translate(-50%,-50%) scale(' + (previa.classList.contains('vendo') ? 1 : 0.92) + ') rotate(-2deg)';
      if (Math.abs(alvoX - posX) > 0.5 || Math.abs(alvoY - posY) > 0.5) {
        requestAnimationFrame(quadro);
      } else {
        rodando = false;
      }
    }

    function mover(ev) {
      alvoX = ev.clientX + 120;
      alvoY = ev.clientY;
      if (!iniciada) { posX = alvoX; posY = alvoY; iniciada = true; }
      if (!rodando) { rodando = true; requestAnimationFrame(quadro); }
    }

    listaPrevia.addEventListener('mousemove', mover);

    listaPrevia.addEventListener('mouseover', function (ev) {
      var cabeca = ev.target.closest ? ev.target.closest('.item-cabeca') : null;
      if (!cabeca) return;
      var item = cabeca.closest('.item');
      var arquivo = item && item.getAttribute('data-previa');
      // trabalho aberto já mostra o carrossel: a prévia só atrapalharia
      if (!arquivo || item.classList.contains('aberto')) { previa.classList.remove('vendo'); return; }
      if (imgPrevia.getAttribute('src') !== arquivo) imgPrevia.setAttribute('src', arquivo);
      previa.classList.add('vendo');
    });

    listaPrevia.addEventListener('mouseleave', function () {
      previa.classList.remove('vendo');
    });
  }

  /* --------------------------- o slide da abertura ---------------------------

     As telas dos sites, uma de cada vez, na janela da abertura. O script só
     troca classes: "ativa" na que entra, "saindo" na que sai (o CSS desliza
     as duas em sentidos opostos); legenda, endereço, pontos e o ambiente
     de fundo acompanham.

     Para quando o mouse está em cima, quando o foco do teclado está dentro,
     quando a pessoa clica numa seta ou num ponto (ela assumiu o controle,
     e aí não volta a rodar sozinho) e quando a aba está escondida. Com
     movimento reduzido nunca roda sozinho. */
  var slide = document.querySelector('[data-slide]');

  if (slide) {
    var telasSlide = slide.querySelectorAll('.tela-slide');
    var quantasSlide = telasSlide.length;
    var atualSlide = 0;
    var relogioSlide = null;
    var pausadoPorEla = false;
    var ESPERA_SLIDE = 5000;

    var legN = slide.querySelector('[data-slide-n]');
    var legCliente = slide.querySelector('[data-slide-cliente]');
    var legRotulo = slide.querySelector('[data-slide-rotulo]');
    var enderecoSlide = slide.querySelector('[data-slide-endereco]');
    var pontosSlide = slide.querySelectorAll('[data-slide-ponto]');
    var barraSlide = slide.querySelector('[data-slide-barra]');
    var ambiente = document.querySelector('[data-ambiente]');
    var camadas = ambiente ? ambiente.querySelectorAll('img') : [];
    var camadaAtiva = 0;

    function dois(n) { return (n < 10 ? '0' : '') + n; }

    // a barra de progresso recomeça do zero a cada tela: tiro a animação,
    // forço o navegador a perceber, e devolvo
    function reiniciarBarra() {
      if (!barraSlide || !slide.classList.contains('rodando')) return;
      barraSlide.style.animation = 'none';
      void barraSlide.offsetWidth;
      barraSlide.style.animation = '';
    }

    function mostrarSlide(i) {
      var anterior = atualSlide;
      atualSlide = (i + quantasSlide) % quantasSlide;
      var tela = telasSlide[atualSlide];

      Array.prototype.forEach.call(telasSlide, function (t, k) {
        t.classList.toggle('ativa', k === atualSlide);
        t.classList.toggle('saindo', k === anterior && anterior !== atualSlide);
        t.setAttribute('aria-hidden', k === atualSlide ? 'false' : 'true');
      });

      if (legN) legN.textContent = dois(atualSlide + 1) + ' / ' + dois(quantasSlide);
      if (legCliente) legCliente.textContent = tela.getAttribute('data-cliente') || '';
      if (legRotulo) legRotulo.textContent = tela.getAttribute('data-rotulo') || '';
      if (enderecoSlide) enderecoSlide.textContent = tela.getAttribute('data-endereco') || '';
      Array.prototype.forEach.call(pontosSlide, function (b, k) {
        b.setAttribute('aria-current', k === atualSlide ? 'true' : 'false');
      });

      // o ambiente: a camada escondida recebe a tela nova e sobe; a outra
      // desce. Na primeira chamada não há troca: a camada da frente já
      // nasce com a primeira tela no HTML.
      if (camadas.length === 2 && anterior !== atualSlide) {
        var img = tela.querySelector('img');
        var proxima = 1 - camadaAtiva;
        if (img && camadas[proxima].getAttribute('src') !== img.getAttribute('src')) {
          camadas[proxima].setAttribute('src', img.getAttribute('src'));
        }
        camadas[proxima].classList.add('ativa');
        camadas[camadaAtiva].classList.remove('ativa');
        camadaAtiva = proxima;
      }

      reiniciarBarra();
    }

    function rodarSlide() {
      if (reduzido) return;
      window.clearInterval(relogioSlide);
      relogioSlide = window.setInterval(function () { mostrarSlide(atualSlide + 1); }, ESPERA_SLIDE);
      slide.classList.add('rodando');
      reiniciarBarra();
    }

    function pararSlide() {
      window.clearInterval(relogioSlide);
      relogioSlide = null;
      slide.classList.remove('rodando');
    }

    function assumir(i) {
      pausadoPorEla = true;
      pararSlide();
      mostrarSlide(i);
    }

    slide.addEventListener('click', function (ev) {
      var seta = ev.target.closest ? ev.target.closest('[data-slide-seta]') : null;
      if (seta) { assumir(atualSlide + (seta.getAttribute('data-slide-seta') === 'dir' ? 1 : -1)); return; }
      var ponto = ev.target.closest ? ev.target.closest('[data-slide-ponto]') : null;
      if (ponto) assumir(parseInt(ponto.getAttribute('data-slide-ponto'), 10));
    });

    slide.addEventListener('keydown', function (ev) {
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
      ev.preventDefault();
      assumir(atualSlide + (ev.key === 'ArrowRight' ? 1 : -1));
    });

    slide.addEventListener('mouseenter', pararSlide);
    slide.addEventListener('mouseleave', function () { if (!pausadoPorEla) rodarSlide(); });
    slide.addEventListener('focusin', pararSlide);
    slide.addEventListener('focusout', function () {
      if (!pausadoPorEla && !slide.contains(document.activeElement)) rodarSlide();
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pararSlide();
      else if (!pausadoPorEla) rodarSlide();
    });

    mostrarSlide(0);
    rodarSlide();
  }

  // o cabeçalho ganha fundo e encolhe depois que a página sai do topo
  var topo = document.getElementById('topo');
  if (topo) {
    var preso = false;
    var conferirTopo = function () {
      var deve = window.scrollY > 24;
      if (deve === preso) return;
      preso = deve;
      topo.classList.toggle('preso', deve);
    };
    conferirTopo();
    window.addEventListener('scroll', conferirTopo, { passive: true });
  }
})();
