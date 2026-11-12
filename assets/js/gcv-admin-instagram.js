/**
 * Painel admin — Instagram.
 * Espelha o que a API oficial publica: foto, carrossel, reel e story.
 */
(function () {
  'use strict';

  var TYPES = [
    { id: 'feed', title: 'Foto no feed', hint: 'Imagem 4:5 com legenda e link', ratio: 'feed' },
    { id: 'carousel', title: 'Carrossel', hint: 'Até 10 fotos, conta como 1 post', ratio: 'feed' },
    { id: 'reel', title: 'Reel', hint: 'Vídeo vertical no feed', ratio: 'story' },
    { id: 'story', title: 'Story', hint: 'Imagem 9:16, some em 24 h', ratio: 'story' }
  ];

  var current = 'feed';
  var root = null;

  function typeById(id) {
    for (var i = 0; i < TYPES.length; i++) if (TYPES[i].id === id) return TYPES[i];
    return TYPES[0];
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render(posts) {
    if (!root) return;
    var type = typeById(current);
    var cells = (posts || []).slice(0, 12).map(function (p) {
      var img = String(p.image || '').replace(/\.(jpe?g|png|webp)$/i, '.w480.webp');
      return '<a href="' + esc(p.permalink) + '" target="_blank" rel="noopener noreferrer">' +
        '<img src="/assets/img/' + esc(img) + '" alt="' + esc(p.alt || '') + '"></a>';
    }).join('');

    root.innerHTML =
      '<div class="gcv-ig">' +
        '<div>' +
          '<div class="gcv-ig-card">' +
            '<h3>Nova publicação</h3>' +
            '<div class="gcv-ig-types">' + TYPES.map(function (t) {
              return '<button type="button" class="gcv-ig-type' + (t.id === current ? ' is-on' : '') + '" data-ig-type="' + t.id + '">' +
                '<strong>' + esc(t.title) + '</strong><span>' + esc(t.hint) + '</span></button>';
            }).join('') + '</div>' +
            '<p class="gcv-ig-note">' + (current === 'story'
              ? 'O story não tem legenda nem adesivo de link. Data, preço e o endereço do site precisam estar na imagem.'
              : 'A legenda pode levar o link da excursão. O carrossel aceita até 10 imagens e conta como uma publicação.') + '</p>' +
            '<div class="gcv-ig-preview gcv-ig-preview--' + type.ratio + '" id="gcv-ig-preview">Escolha a imagem</div>' +
            '<label>Imagem ou vídeo<input type="file" id="gcv-ig-file" accept="' + (current === 'reel' ? 'video/*' : 'image/*') + '" ' + (current === 'carousel' ? 'multiple' : '') + '></label>' +
            (current === 'story' ? '' : '<label>Legenda<textarea id="gcv-ig-caption" maxlength="2200" placeholder="Texto do post"></textarea></label>') +
            '<p class="gcv-ig-warn">Publicar daqui ainda espera a permissão de publicação da Meta. A leitura do feed já funciona. O botão entra no ar quando essa permissão estiver no token.</p>' +
            '<button type="button" class="gcv-dash-btn gcv-dash-btn--primary" disabled>Publicar no Instagram</button>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<div class="gcv-ig-card">' +
            '<h3>Automático</h3>' +
            '<ul class="gcv-ig-rules">' +
              '<li><strong>Excursão publicada.</strong> Um story e um post no feed, uma vez. Rascunho e rejeição não publicam.</li>' +
              '<li><strong>48 horas antes da saída.</strong> Um story de lembrete, se ainda houver vaga e o passeio não estiver cancelado.</li>' +
              '<li><strong>Últimas vagas.</strong> Um story quando restam 3 lugares ou menos, uma vez por excursão.</li>' +
              '<li><strong>Quinta, 8h.</strong> Um story só, com as saídas abertas da semana. Não um story por passeio.</li>' +
              '<li><strong>Revista.</strong> Um post no feed quando a matéria entra no ar. Sem story.</li>' +
              '<li><strong>Horário.</strong> Só entre 8h e 20h. O que acontecer de noite espera a manhã seguinte. No máximo 4 stories automáticos por dia.</li>' +
              '<li><strong>Grade do site.</strong> Atualiza a cada 6 horas com o feed. Story não entra nessa grade: some em 24 horas.</li>' +
            '</ul>' +
          '</div>' +
          '<div class="gcv-ig-card">' +
            '<h3>No ar agora</h3>' +
            (cells ? '<div class="gcv-ig-feed">' + cells + '</div>' : '<p class="gcv-ig-note">Nenhuma foto no pool ainda.</p>') +
          '</div>' +
        '</div>' +
      '</div>';

    root.querySelectorAll('[data-ig-type]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        current = btn.getAttribute('data-ig-type');
        render(posts);
      });
    });
    var file = document.getElementById('gcv-ig-file');
    var preview = document.getElementById('gcv-ig-preview');
    if (file && preview) {
      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        if (!f || f.type.indexOf('image/') !== 0) {
          preview.textContent = f ? f.name : 'Escolha a imagem';
          return;
        }
        var url = URL.createObjectURL(f);
        preview.innerHTML = '<img alt="" src="' + url + '">';
      });
    }
  }

  function open() {
    root = document.getElementById('admin-instagram-root');
    render([]);
    fetch('/assets/data/instagram-pool.json?v=1.1.40', { credentials: 'same-origin' })
      .then(function (res) { return res.ok ? res.json() : { posts: [] }; })
      .then(function (data) { render((data && data.posts) || []); })
      .catch(function () { render([]); });
  }

  window.GcvAdminInstagram = { open: open };
})();
