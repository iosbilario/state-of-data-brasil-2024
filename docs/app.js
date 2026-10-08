/* State of Data Brasil 2024/25 — renderização dos gráficos (Chart.js 4) */
(function () {
  const D = window.SOD;
  if (!D) { document.body.insertAdjacentHTML("beforeend", "<p style='padding:24px'>data.js não carregou.</p>"); return; }

  // ---------- formatos ----------
  const ptBR = "pt-BR";
  const fmt = {
    int: v => Math.round(v).toLocaleString(ptBR),
    pct: v => v.toLocaleString(ptBR, { maximumFractionDigits: 1 }) + "%",
    pct0: v => Math.round(v).toLocaleString(ptBR) + "%",
    pctabs: v => Math.abs(v).toLocaleString(ptBR, { maximumFractionDigits: 1 }) + "%",
    pctsigned: v => (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toLocaleString(ptBR, { maximumFractionDigits: 1 }) + "%",
    brl: v => "R$ " + (v / 1000).toLocaleString(ptBR, { maximumFractionDigits: 1 }) + " mil",
    brlk: v => (v / 1000).toLocaleString(ptBR, { maximumFractionDigits: 0 }) + "k",
    faixa: v => "R$ 8–12 mil",
    raw: v => String(v),
  };

  // ---------- derivados para o texto ----------
  const by = (arr, label) => (arr || []).find(x => x.label === label) || {};
  const derived = {
    remoto: {
      sat_remoto: by(D.remoto.satisfacao_por_modelo, "100% remoto").pct,
      sat_presencial: by(D.remoto.satisfacao_por_modelo, "100% presencial").pct,
    },
    div: {
      gap_senior: by(D.diversidade.gap_genero_por_nivel, "Sênior").gap_pct,
      pretos_junior: by(D.diversidade.raca_por_estagio, "Júnior").Preta,
      pretos_diretor: by(D.diversidade.raca_por_estagio, "Diretor / VP").Preta,
      mulher_genero: by(D.diversidade.prejuizo_percebido, "Mulheres").genero,
      preta_raca: by(D.diversidade.prejuizo_percebido, "Pessoas pretas").raca,
    },
    ia: {
      gratis: by(D.ia.uso.items, "Usa só versões gratuitas").pct,
      prio_top2: (by(D.ia.prioridade_gestores, "Principal prioridade da empresa").pct || 0) + (by(D.ia.prioridade_gestores, "Entre as principais prioridades (2–4 anos)").pct || 0),
    },
    stack: {
      sql: by(D.stack.linguagens.items, "SQL").pct,
      python: by(D.stack.linguagens.items, "Python").pct,
      r: by(D.stack.linguagens.items, "R").pct,
      aws: by(D.stack.cloud.items, "AWS").pct,
      publico_onprem: by(D.stack.cloud_por_setor_flags, "Setor público")["On-premise / sem cloud"],
      multi_cloud_pct: D.stack.multi_cloud_pct,
      powerbi: by(D.stack.bi.items, "Microsoft PowerBI").pct,
      powerbi_pref: by(D.stack.bi_preferida, "Microsoft PowerBI").pct,
    },
  };
  const get = path => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), { ...D, ...derived, remoto: { ...D.remoto, ...derived.remoto }, div: derived.div, ia: { ...D.ia, ...derived.ia }, stack: { ...D.stack, ...derived.stack } });
  document.querySelectorAll("[data-k]").forEach(el => {
    const v = get(el.dataset.k);
    if (v == null) return;
    const f = fmt[el.dataset.fmt || "raw"];
    el.textContent = f(v);
  });

  // ---------- tema ----------
  const root = document.documentElement;
  const saved = (() => { try { return localStorage.getItem("sod-theme"); } catch (e) { return null; } })();
  if (saved) root.dataset.theme = saved;
  document.getElementById("themeToggle").addEventListener("click", () => {
    const dark = isDark();
    root.dataset.theme = dark ? "light" : "dark";
    try { localStorage.setItem("sod-theme", root.dataset.theme); } catch (e) {}
    rerender();
  });
  function isDark() {
    if (root.dataset.theme) return root.dataset.theme === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (!root.dataset.theme) rerender(); });

  const css = name => getComputedStyle(root).getPropertyValue(name).trim();
  const T = () => ({
    s1: css("--s1"), s2: css("--s2"), s3: css("--s3"), s4: css("--s4"), s5: css("--s5"),
    gray: css("--gray"), gray2: css("--gray-2"), ink: css("--ink"), ink2: css("--ink-2"), muted: css("--muted"), grid: css("--grid"), axis: css("--axis"),
    seq: [css("--seq-1"), css("--seq-2"), css("--seq-3"), css("--seq-4"), css("--seq-5"), css("--seq-6"), css("--seq-7")],
  });

  Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  Chart.defaults.font.size = 12;
  Chart.defaults.animation = false;
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.enabled = false;

  // ---------- tooltip HTML ----------
  const tip = document.getElementById("tip");
  function externalTooltip(ctx) {
    const { chart, tooltip: tt } = ctx;
    if (!tt || tt.opacity === 0) { tip.classList.remove("on"); return; }
    const dp = tt.dataPoints && tt.dataPoints[0];
    if (!dp) { tip.classList.remove("on"); return; }
    const spec = chart.$spec;
    const html = spec.tooltip ? spec.tooltip(dp, chart) : defaultTooltip(dp, chart);
    if (!html) { tip.classList.remove("on"); return; }
    tip.innerHTML = html;
    const rect = chart.canvas.getBoundingClientRect();
    let x = rect.left + window.scrollX + tt.caretX + 14;
    let y = rect.top + window.scrollY + tt.caretY - 10;
    tip.classList.add("on");
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    if (x + tw > window.scrollX + window.innerWidth - 8) x = rect.left + window.scrollX + tt.caretX - tw - 14;
    if (y + th > window.scrollY + window.innerHeight - 8) y = window.scrollY + window.innerHeight - th - 8;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  function defaultTooltip(dp, chart) {
    const spec = chart.$spec;
    const ds = chart.data.datasets[dp.datasetIndex];
    const label = chart.data.labels[dp.dataIndex];
    const v = dp.raw;
    const extra = spec.extra ? spec.extra(dp.dataIndex, dp.datasetIndex) : "";
    const series = chart.data.datasets.length > 1 ? `<b>${ds.label}</b> · ` : "";
    return `<span class="t">${esc(ds._full ? ds._full[dp.dataIndex] : label)}</span>${series}<b>${spec.fmt(v)}</b>${extra ? "<br>" + extra : ""}`;
  }
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  // ---------- plugin: rótulos diretos ----------
  const valueLabels = {
    id: "valueLabels",
    afterDatasetsDraw(chart, _a, opts) {
      if (!opts || !opts.show) return;
      const { ctx } = chart;
      const horizontal = chart.options.indexAxis === "y";
      chart.data.datasets.forEach((ds, i) => {
        const meta = chart.getDatasetMeta(i);
        if (meta.hidden) return;
        meta.data.forEach((bar, j) => {
          const v = ds.data[j];
          if (v == null) return;
          const text = opts.fmt(v);
          ctx.save();
          ctx.font = (opts.bold ? "600 " : "") + "11.5px " + Chart.defaults.font.family;
          ctx.textBaseline = "middle";
          if (opts.inside) {
            // dentro do segmento (stacked) se couber
            const w = Math.abs(bar.x - bar.base), tw = ctx.measureText(text).width;
            if (w < tw + 10) { ctx.restore(); return; }
            ctx.fillStyle = opts.insideColor || "#fff";
            ctx.textAlign = "center";
            ctx.fillText(text, (bar.x + bar.base) / 2, bar.y);
          } else if (horizontal) {
            ctx.fillStyle = opts.color;
            ctx.textAlign = "left";
            ctx.fillText(text, Math.max(bar.x, bar.base) + 6, bar.y);
          } else {
            ctx.fillStyle = opts.color;
            ctx.textAlign = "center";
            ctx.fillText(text, bar.x, Math.min(bar.y, bar.base) - 9);
          }
          ctx.restore();
        });
      });
    },
  };
  Chart.register(valueLabels);

  // ---------- fábrica de cards ----------
  const registry = [];
  function card(el, spec) {
    el.innerHTML = "";
    const head = document.createElement("div"); head.className = "card-head";
    head.innerHTML = `<div><h3>${spec.title}</h3><p class="sub">${spec.sub || ""}</p></div><div class="tools"><button class="tbtn" type="button" aria-pressed="false">Tabela</button></div>`;
    el.appendChild(head);
    const legend = document.createElement("div"); legend.className = "legend"; el.appendChild(legend);
    const plot = document.createElement("div"); plot.className = "plot";
    const canvas = document.createElement("canvas"); plot.appendChild(canvas); el.appendChild(plot);
    const tw = document.createElement("div"); tw.className = "tablewrap"; el.appendChild(tw);
    if (spec.foot) { const f = document.createElement("p"); f.className = "foot"; f.innerHTML = spec.foot; el.appendChild(f); }
    const btn = head.querySelector(".tbtn");
    btn.addEventListener("click", () => {
      const on = el.dataset.view !== "table";
      el.dataset.view = on ? "table" : "chart";
      btn.setAttribute("aria-pressed", String(on));
      btn.textContent = on ? "Gráfico" : "Tabela";
    });
    const entry = { el, spec, canvas, legend, tw, chart: null };
    registry.push(entry);
    draw(entry);
  }
  function rerender() { registry.forEach(draw); }

  function draw(entry) {
    const { spec, canvas, legend, tw } = entry;
    const t = T();
    if (entry.chart) { entry.chart.destroy(); entry.chart = null; }
    const built = spec.build(t);
    const n = built.labels.length;
    const horizontal = built.indexAxis !== "x";
    const rowH = built.rowH || (built.stacked ? 30 : built.datasets.length > 1 ? 14 * built.datasets.length + 14 : 26);
    const h = horizontal ? Math.max(120, n * rowH + 44) : (built.height || 240);
    canvas.parentElement.style.height = h + "px";
    const colors = built.datasets.map(d => d.backgroundColor);
    const baseScale = { grid: { color: t.grid, drawTicks: false, lineWidth: 1 }, border: { display: false }, ticks: { color: t.muted, padding: 6 } };
    const valueAxis = {
      ...baseScale, beginAtZero: true,
      max: built.max, stacked: !!built.stacked,
      ticks: { ...baseScale.ticks, callback: v => (built.tick || defaultTick(spec))(v), maxTicksLimit: 6 },
      grid: { ...baseScale.grid, display: built.showGrid !== false },
    };
    const catAxis = {
      ...baseScale, stacked: !!built.stacked,
      grid: { display: false }, ticks: { ...baseScale.ticks, color: t.ink2, autoSkip: false, font: { size: 12 }, callback: function (v) { const l = this.getLabelForValue(v); const mx = this.chart.width < 420 ? 22 : this.chart.width < 560 ? 30 : 46; return l.length > mx ? l.slice(0, mx - 1) + "…" : l; } },
    };
    const multi = built.datasets.length > 1;
    entry.chart = new Chart(canvas, {
      type: "bar",
      data: { labels: built.labels, datasets: built.datasets.map((d, i) => ({ ...d, borderRadius: built.stacked ? 2 : 4, borderSkipped: built.stacked ? false : "start", barPercentage: built.stacked ? 0.62 : multi ? 0.86 : 0.58, categoryPercentage: multi ? 0.78 : 0.9, borderWidth: built.stacked ? 1.5 : 0, borderColor: built.stacked ? css("--surface") : undefined, maxBarThickness: 22 })) },
      options: {
        indexAxis: horizontal ? "y" : "x",
        responsive: true, maintainAspectRatio: false,
        layout: { padding: { right: horizontal && !built.stacked ? 52 : 8, top: !horizontal ? 18 : 4, left: 0 } },
        scales: horizontal ? { x: valueAxis, y: catAxis } : { x: catAxis, y: valueAxis },
        interaction: { mode: built.stacked ? "nearest" : "index", axis: horizontal ? "y" : "x", intersect: false },
        onHover: (e, els) => { e.native.target.style.cursor = els.length ? "crosshair" : "default"; },
        plugins: {
          tooltip: { enabled: false, external: externalTooltip },
          valueLabels: { show: built.labelsOn !== false, fmt: built.labelFmt || spec.fmt, color: t.ink2, inside: !!built.stacked, insideColor: "#fff" },
        },
      },
    });
    entry.chart.$spec = spec;
    // legenda
    legend.innerHTML = multi ? built.datasets.map(d => `<span><i style="background:${d.backgroundColor}"></i>${esc(d.label)}</span>`).join("") : "";
    // tabela
    const cols = built.datasets.map(d => d.label || spec.valueName || "Valor");
    let html = `<table><thead><tr><th>${esc(built.catName || "Categoria")}</th>${cols.map(c => `<th class="num">${esc(c)}</th>`).join("")}${built.nCol ? "<th class='num'>n</th>" : ""}</tr></thead><tbody>`;
    built.labels.forEach((l, i) => {
      html += `<tr><td>${esc((built.datasets[0]._full && built.datasets[0]._full[i]) || l)}</td>${built.datasets.map(d => `<td class="num">${d.data[i] == null ? "–" : spec.fmt(d.data[i])}</td>`).join("")}${built.nCol ? `<td class="num">${fmt.int(built.nCol[i])}</td>` : ""}</tr>`;
    });
    tw.innerHTML = html + "</tbody></table>";
  }

  function defaultTick(spec) {
    if (spec.fmt === fmt.brl) return fmt.brlk;
    if (spec.fmt === fmt.pct || spec.fmt === fmt.pct0) return v => v + "%";
    if (spec.fmt === fmt.pctsigned) return v => (v > 0 ? "+" : "") + v + "%";
    return v => v;
  }
  // ---------- helpers de construção ----------
  const simple = (items, { key = "pct", color = "s1", highlight, highlightColor = "s2", full = true } = {}) => t => ({
    labels: items.map(x => shortLabel(x.full || x.label)),
    datasets: [{ label: "", data: items.map(x => x[key]), backgroundColor: items.map((x, i) => (highlight && highlight(x, i)) ? t[highlightColor] : t[color]), _full: full ? items.map(x => x.full || x.label) : undefined }],
    nCol: items.map(x => x.n),
  });
  const grouped = (labels, series, extra = {}) => t => ({
    labels,
    datasets: series.map(s => ({ label: s.name, data: s.data, backgroundColor: t[s.color] })),
    ...extra,
  });
  const stacked = (rows, columns, colors, extra = {}) => t => ({
    labels: rows.map(r => r.label),
    datasets: columns.map((c, i) => ({ label: c, data: rows.map(r => r.values[c]), backgroundColor: t[colors[i]] })),
    stacked: true, max: 100, nCol: rows.map(r => r.n), ...extra,
  });
  const nOf = (items, i) => items[i] && items[i].n != null ? `n = ${fmt.int(items[i].n)}` : "";

  // ---------- especificações ----------
  const S = D.salario, R = D.remoto, V = D.diversidade, M = D.mercado, I = D.ia, K = D.stack, G = D.gestores, P = D.perfil;
  const specs = {
    // ---- salário ----
    sal_situacao: {
      title: "Salário médio por vínculo de trabalho", sub: "Média do ponto médio da faixa salarial. Destaque: quem é pago por empresa estrangeira.",
      fmt: fmt.brl, valueName: "Média", build: simple(S.por_situacao, { key: "media", highlight: x => x.label.includes("exterior") || x.label.includes("de fora") }),
      extra: i => { const x = S.por_situacao[i]; return `mediana ${fmt.brl(x.mediana)} · P25–P75 ${fmt.brlk(x.p25)}–${fmt.brlk(x.p75)} · ${fmt.pct0(x.acima12k)} acima de R$ 12 mil · n = ${fmt.int(x.n)}`; },
    },
    sal_cargo: {
      title: "Salário médio por cargo", sub: "Não gestores. Cargos com 40+ respostas.",
      fmt: fmt.brl, valueName: "Média", build: simple(S.por_cargo, { key: "media" }),
      extra: i => { const x = S.por_cargo[i]; return `mediana ${fmt.brl(x.mediana)} · P25–P75 ${fmt.brlk(x.p25)}–${fmt.brlk(x.p75)} · n = ${fmt.int(x.n)}`; },
    },
    sal_cargo_nivel: {
      title: "Cargo × senioridade", sub: "Média salarial. Um sênior ganha de 2,5 a 3,5 vezes um júnior no mesmo cargo.",
      fmt: fmt.brl, build: grouped(S.por_cargo_nivel.map(x => x.cargo), [
        { name: "Júnior", color: "s3", data: S.por_cargo_nivel.map(x => x["Júnior"] ? x["Júnior"].media : null) },
        { name: "Pleno", color: "s1", data: S.por_cargo_nivel.map(x => x["Pleno"] ? x["Pleno"].media : null) },
        { name: "Sênior", color: "s2", data: S.por_cargo_nivel.map(x => x["Sênior"] ? x["Sênior"].media : null) },
      ], { labelFmt: fmt.brlk }),
      extra: (i, d) => { const nv = ["Júnior", "Pleno", "Sênior"][d]; const x = S.por_cargo_nivel[i][nv]; return x ? `n = ${fmt.int(x.n)}` : ""; },
    },
    sal_experiencia: {
      title: "Salário médio por tempo de experiência em dados", sub: "A curva é quase linear até 10 anos.",
      fmt: fmt.brl, valueName: "Média", build: simple(S.por_experiencia, { key: "media" }),
      extra: i => { const x = S.por_experiencia[i]; return `mediana ${fmt.brl(x.mediana)} · n = ${fmt.int(x.n)}`; },
    },
    sal_modelo: {
      title: "Salário médio por modelo de trabalho", sub: "O presencial concentra juniores: leia junto com o gráfico de senioridade.",
      fmt: fmt.brl, valueName: "Média", build: simple(S.por_modelo, { key: "media", highlight: x => x.label === "100% presencial", highlightColor: "gray2" }),
      extra: i => { const x = S.por_modelo[i]; return `mediana ${fmt.brl(x.mediana)} · ${fmt.pct0(x.acima12k)} acima de R$ 12 mil · n = ${fmt.int(x.n)}`; },
    },
    sal_distribuicao_nivel: {
      title: "Distribuição salarial por senioridade", sub: "% de cada nível em cada faixa. Picos: júnior 4–6k, pleno 8–12k, sênior 12–16k.",
      fmt: fmt.pct, build: t => ({
        indexAxis: "x", height: 260, labelsOn: false,
        labels: S.faixas_order,
        datasets: [
          { label: "Júnior", data: S.distribuicao_por_nivel["Júnior"], backgroundColor: t.s3 },
          { label: "Pleno", data: S.distribuicao_por_nivel["Pleno"], backgroundColor: t.s1 },
          { label: "Sênior", data: S.distribuicao_por_nivel["Sênior"], backgroundColor: t.s2 },
        ], tick: v => v + "%", catName: "Faixa (R$ mil/mês)",
      }),
    },
    sal_uf: {
      title: "Salário médio por estado", sub: "Estados com 40+ respostas. SP e DF no topo.",
      fmt: fmt.brl, valueName: "Média", build: simple(S.por_uf, { key: "media" }),
      extra: i => { const x = S.por_uf[i]; return `mediana ${fmt.brl(x.mediana)} · n = ${fmt.int(x.n)}`; },
    },
    sal_ensino: {
      title: "Salário médio por escolaridade", sub: "Mestrado paga mais que doutorado na média; ambos acima da pós lato sensu.",
      fmt: fmt.brl, valueName: "Média", build: simple(S.por_ensino, { key: "media" }),
      extra: i => `n = ${fmt.int(S.por_ensino[i].n)}`,
    },
    sal_gestao: {
      title: "Salário médio por cargo de gestão", sub: "Diretor/VP: média de R$ 34 mil. C-level inclui sócios de empresas pequenas.",
      fmt: fmt.brl, valueName: "Média", build: simple(S.por_cargo_gestao, { key: "media", color: "s2" }),
      extra: i => { const x = S.por_cargo_gestao[i]; return `mediana ${fmt.brl(x.mediana)} · n = ${fmt.int(x.n)}`; },
    },

    // ---- remoto ----
    rem_atual_ideal: {
      title: "Modelo atual × modelo ideal", sub: "% dos respondentes empregados. O híbrido flexível é o que mais gente quer e não tem.",
      fmt: fmt.pct, build: grouped(R.atual.map(x => x.label), [
        { name: "Modelo atual", color: "gray2", data: R.atual.map(x => x.pct) },
        { name: "Modelo ideal", color: "s1", data: R.ideal.map(x => x.pct) },
      ]),
    },
    rem_atitude: {
      title: "“E se a empresa exigir 100% presencial?”", sub: "% dos empregados.",
      fmt: fmt.pct, build: simple(R.atitude, { highlight: x => x.label !== "Aceita voltar", highlightColor: "s1", color: "gray2" }),
    },
    rem_ideal_por_atual: {
      title: "Reação ao retorno presencial, por modelo atual", sub: "Entre os 100% remotos, 91% procurariam outra vaga. Entre os presenciais, 33%.",
      fmt: fmt.pct, build: stacked(R.atitude_por_modelo.rows, R.atitude_por_modelo.columns, ["gray2", "s1", "s2"]),
    },
    rem_satisfacao: {
      title: "Satisfação com o emprego por modelo de trabalho", sub: "% satisfeitos.",
      fmt: fmt.pct, valueName: "Satisfeitos", build: simple(R.satisfacao_por_modelo, { highlight: x => x.label === "100% presencial", highlightColor: "gray2" }),
    },
    rem_nivel: {
      title: "Modelo de trabalho por senioridade", sub: "Quanto mais sênior, mais remoto. Juniores são 4x mais presenciais que seniores.",
      fmt: fmt.pct, build: stacked(R.modelo_por_nivel.rows, R.modelo_por_nivel.columns, ["s1", "s3", "s4", "gray2"]),
    },

    // ---- diversidade ----
    div_mulheres_estagio: {
      title: "Participação de mulheres por degrau da carreira", sub: "% de mulheres em cada nível / cargo de gestão.",
      fmt: fmt.pct, valueName: "% mulheres", build: simple(V.mulheres_por_estagio, { color: "s2" }),
    },
    div_raca_estagio: {
      title: "Cor/raça por degrau da carreira", sub: "% em cada nível. Pessoas pretas e pardas somam 32% dos juniores e 13% da diretoria.",
      fmt: fmt.pct, build: t => ({
        labels: V.raca_por_estagio.map(x => x.label), stacked: true, max: 100, nCol: V.raca_por_estagio.map(x => x.n),
        datasets: [
          { label: "Branca", data: V.raca_por_estagio.map(x => x.Branca), backgroundColor: t.gray2 },
          { label: "Parda", data: V.raca_por_estagio.map(x => x.Parda), backgroundColor: t.s1 },
          { label: "Preta", data: V.raca_por_estagio.map(x => x.Preta), backgroundColor: t.s2 },
          { label: "Amarela", data: V.raca_por_estagio.map(x => x.Amarela), backgroundColor: t.s4 },
        ],
      }),
    },
    div_gap_nivel: {
      title: "Salário médio por gênero e senioridade", sub: "Gap: +7% no júnior, −4% no pleno, −17% no sênior (mulheres vs. homens).",
      fmt: fmt.brl, build: grouped(V.gap_genero_por_nivel.map(x => x.label), [
        { name: "Mulheres", color: "s2", data: V.gap_genero_por_nivel.map(x => x.fem) },
        { name: "Homens", color: "s1", data: V.gap_genero_por_nivel.map(x => x.masc) },
      ], { labelFmt: fmt.brlk }),
      extra: (i, d) => { const x = V.gap_genero_por_nivel[i]; return `gap ${fmt.pctsigned(x.gap_pct)} · n = ${fmt.int(d === 0 ? x.n_fem : x.n_masc)}`; },
    },
    div_gap_exp: {
      title: "Diferença salarial mulheres vs. homens, por experiência", sub: "Média das mulheres em relação à dos homens com o mesmo tempo de área.",
      fmt: fmt.pctsigned, valueName: "Gap", build: t => ({
        labels: V.gap_genero_por_experiencia.map(x => x.label), nCol: V.gap_genero_por_experiencia.map(x => x.n_fem + x.n_masc),
        datasets: [{ label: "", data: V.gap_genero_por_experiencia.map(x => x.gap_pct), backgroundColor: V.gap_genero_por_experiencia.map(x => x.gap_pct < 0 ? t.s2 : t.s3) }],
        tick: v => (v > 0 ? "+" : "") + v + "%",
      }),
      extra: i => { const x = V.gap_genero_por_experiencia[i]; return `mulheres ${fmt.brl(x.fem)} (n=${x.n_fem}) · homens ${fmt.brl(x.masc)} (n=${x.n_masc})`; },
    },
    div_gap_cargo: {
      title: "Diferença salarial mulheres vs. homens, por cargo", sub: "Cargos com 25+ mulheres e 25+ homens. Engenharia de dados tem o maior gap.",
      fmt: fmt.pctsigned, valueName: "Gap", build: t => {
        const items = [...V.gap_genero_por_cargo].sort((a, b) => a.gap_pct - b.gap_pct);
        return {
          labels: items.map(x => x.label), nCol: items.map(x => x.n_fem + x.n_masc),
          datasets: [{ label: "", data: items.map(x => x.gap_pct), backgroundColor: items.map(x => x.gap_pct < 0 ? t.s2 : t.s3) }],
          tick: v => (v > 0 ? "+" : "") + v + "%",
        };
      },
      extra: i => { const items = [...V.gap_genero_por_cargo].sort((a, b) => a.gap_pct - b.gap_pct); const x = items[i]; return `mulheres ${fmt.brl(x.fem)} (n=${x.n_fem}) · homens ${fmt.brl(x.masc)} (n=${x.n_masc})`; },
    },
    div_gap_raca_nivel: {
      title: "Salário médio por cor/raça e senioridade", sub: "Pessoas pretas e pardas ganham de 3% a 14% menos que brancas no mesmo nível.",
      fmt: fmt.brl, build: grouped(V.gap_raca_por_nivel.map(x => x.label), [
        { name: "Branca", color: "gray2", data: V.gap_raca_por_nivel.map(x => x.Branca) },
        { name: "Parda", color: "s1", data: V.gap_raca_por_nivel.map(x => x.Parda) },
        { name: "Preta", color: "s2", data: V.gap_raca_por_nivel.map(x => x.Preta) },
      ], { labelFmt: fmt.brlk }),
      extra: (i, d) => { const x = V.gap_raca_por_nivel[i]; const k = ["Branca", "Parda", "Preta"][d]; return `n = ${fmt.int(x["n_" + k])}` + (k !== "Branca" ? ` · gap vs. brancas ${fmt.pctsigned(x["gap_" + k])}` : ""); },
    },
    div_prejuizo: {
      title: "“Minha experiência profissional foi prejudicada por…”", sub: "% de cada grupo que aponta o motivo. Pergunta feita a mulheres, pessoas não brancas e PCD.",
      fmt: fmt.pct, build: grouped(V.prejuizo_percebido.map(x => x.label), [
        { name: "Gênero", color: "s2", data: V.prejuizo_percebido.map(x => x.genero) },
        { name: "Cor/raça", color: "s1", data: V.prejuizo_percebido.map(x => x.raca) },
        { name: "Não foi afetada", color: "gray2", data: V.prejuizo_percebido.map(x => x.nao_afetado) },
      ]),
      extra: i => `n = ${fmt.int(V.prejuizo_percebido[i].n)}`,
    },
    div_aspectos: {
      title: "Onde o prejuízo aparece", sub: `% entre quem se sente prejudicada(o) (n = ${fmt.int(V.aspectos_prejudicados.answered)}).`,
      fmt: fmt.pct, build: simple(V.aspectos_prejudicados.items, { color: "s2" }),
    },

    // ---- mercado ----
    mer_sat_salario: {
      title: "Satisfação com o emprego por faixa salarial", sub: "% satisfeitos. Sobe de 47% abaixo de R$ 4 mil para 86% acima de R$ 40 mil.",
      fmt: fmt.pct, valueName: "Satisfeitos", build: t => ({
        indexAxis: "x", height: 240, labels: M.satisfacao_por_salario.map(x => x.label), catName: "Faixa (R$ mil/mês)",
        datasets: [{ label: "", data: M.satisfacao_por_salario.map(x => x.pct), backgroundColor: M.satisfacao_por_salario.map((x, i, a) => t.seq[Math.min(6, Math.floor(i / a.length * 7))]) }],
        tick: v => v + "%", nCol: M.satisfacao_por_salario.map(x => x.n), labelFmt: fmt.pct0,
      }),
      extra: i => `n = ${fmt.int(M.satisfacao_por_salario[i].n)}`,
    },
    mer_busca_salario: {
      title: "Quem está buscando emprego, por faixa salarial", sub: "% buscando ativamente (Brasil ou exterior).",
      fmt: fmt.pct, valueName: "Buscando", build: t => ({
        indexAxis: "x", height: 240, labels: M.busca_por_salario.map(x => x.label), catName: "Faixa (R$ mil/mês)",
        datasets: [{ label: "", data: M.busca_por_salario.map(x => x.pct), backgroundColor: M.busca_por_salario.map((x, i, a) => t.seq[6 - Math.min(6, Math.floor(i / a.length * 7))]) }],
        tick: v => v + "%", nCol: M.busca_por_salario.map(x => x.n), labelFmt: fmt.pct0,
      }),
      extra: i => `n = ${fmt.int(M.busca_por_salario[i].n)}`,
    },
    mer_planos_sat: {
      title: "Planos de mudar de emprego: satisfeitos vs. insatisfeitos", sub: "70% dos insatisfeitos estão buscando. Mas mesmo entre os satisfeitos, 45% se dizem abertos.",
      fmt: fmt.pct, build: stacked(M.planos_por_satisfacao.rows, M.planos_por_satisfacao.columns, ["gray2", "s3", "s1", "s2"]),
    },
    mer_motivos: {
      title: "Motivos de insatisfação", sub: `% entre os insatisfeitos (n = ${fmt.int(M.motivos_insatisfacao.answered)}). Múltipla escolha.`,
      fmt: fmt.pct, build: simple(M.motivos_insatisfacao.items, { highlight: (x, i) => i === 0 }),
    },
    mer_criterios: {
      title: "Critérios para escolher o próximo emprego", sub: `% dos empregados (n = ${fmt.int(M.criterios_escolha.answered)}). Múltipla escolha.`,
      fmt: fmt.pct, build: simple(M.criterios_escolha.items, { highlight: (x, i) => i < 2 }),
    },
    mer_layoff_setor: {
      title: "Layoffs em 2024 por setor", sub: "% que viram demissões em massa na própria empresa. Setores com 70+ respostas.",
      fmt: fmt.pct, valueName: "Houve layoff", build: simple(M.layoff_por_setor, { color: "s2" }),
      extra: i => `n = ${fmt.int(M.layoff_por_setor[i].n)}`,
    },
    mer_entrevistas: {
      title: "Processos seletivos nos últimos 6 meses", sub: "% dos empregados. Metade participou de alguma entrevista.",
      fmt: fmt.pct, build: simple(M.entrevistas),
    },

    // ---- IA ----
    ia_uso: {
      title: "Como usam IA generativa no trabalho", sub: `% dos respondentes (n = ${fmt.int(I.uso.answered)}). Múltipla escolha.`,
      fmt: fmt.pct, build: simple(I.uso.items, { highlight: x => x.label === "A empresa paga" }),
    },
    ia_por_atuacao: {
      title: "Adoção por área de atuação", sub: "% com ferramenta paga (própria ou da empresa) e % usando Copilot.",
      fmt: fmt.pct, build: grouped(I.uso_por_atuacao.map(x => x.label), [
        { name: "Tem ferramenta paga", color: "s1", data: I.uso_por_atuacao.map(x => x.paga) },
        { name: "Usa Copilot", color: "s3", data: I.uso_por_atuacao.map(x => x.copilot) },
        { name: "Só gratuita", color: "gray2", data: I.uso_por_atuacao.map(x => x.gratis) },
      ]),
      extra: i => `usa alguma IA: ${fmt.pct(I.uso_por_atuacao[i].usa)} · n = ${fmt.int(I.uso_por_atuacao[i].n)}`,
    },
    ia_por_nivel: {
      title: "Quem paga a ferramenta, por senioridade", sub: "A empresa paga para 12% dos juniores e 24% dos seniores.",
      fmt: fmt.pct, build: grouped(I.uso_por_nivel.map(x => x.label), [
        { name: "A empresa paga", color: "s1", data: I.uso_por_nivel.map(x => x.empresa_paga) },
        { name: "Paga do próprio bolso", color: "s2", data: I.uso_por_nivel.map(x => x.proprio) },
        { name: "Só gratuita", color: "gray2", data: I.uso_por_nivel.map(x => x.gratis) },
      ]),
      extra: i => `n = ${fmt.int(I.uso_por_nivel[i].n)}`,
    },
    ia_por_setor: {
      title: "Empresa paga a ferramenta de IA, por setor", sub: "% cuja empresa paga. Setores com 90+ respostas.",
      fmt: fmt.pct, valueName: "Empresa paga", build: simple([...I.uso_por_setor].sort((a, b) => b.empresa_paga - a.empresa_paga), { key: "empresa_paga" }),
      extra: i => { const x = [...I.uso_por_setor].sort((a, b) => b.empresa_paga - a.empresa_paga)[i]; return `próprio bolso ${fmt.pct(x.proprio)} · Copilot ${fmt.pct(x.copilot)} · n = ${fmt.int(x.n)}`; },
    },
    ia_prioridade: {
      title: "Gestores: IA generativa é prioridade na empresa?", sub: `n = ${fmt.int(G.n)} gestores.`,
      fmt: fmt.pct, build: t => ({
        labels: ["Gestores"], stacked: true, max: 100, rowH: 48,
        datasets: I.prioridade_gestores.map((x, i) => ({ label: x.label, data: [x.pct], backgroundColor: [t.s1, t.seq[2], t.s4, t.gray2, t.gray][i] })),
      }),
    },
    ia_barreiras: {
      title: "Barreiras para usar IA generativa", sub: `% entre gestores (n = ${fmt.int(I.barreiras.answered)}). Múltipla escolha.`,
      fmt: fmt.pct, build: simple(I.barreiras.items, { color: "s2" }),
    },
    ia_empresa: {
      title: "Como a empresa usa IA generativa", sub: `% dos respondentes (n = ${fmt.int(I.empresa.answered)}). Múltipla escolha.`,
      fmt: fmt.pct, build: simple(I.empresa.items),
    },
    ia_salario_perfil: {
      title: "Salário médio por perfil de uso de IA, dentro do mesmo nível", sub: "Correlação, não causa. Quem tem ferramenta paga ganha mais em todos os níveis.",
      fmt: fmt.brl, build: t => {
        const perfis = ["Não usa", "Usa só versões gratuitas", "Paga do próprio bolso", "A empresa paga"];
        const cols = ["gray", "gray2", "s2", "s1"];
        return {
          labels: I.salario_por_perfil_nivel.map(x => x.nivel), labelFmt: fmt.brlk,
          datasets: perfis.map((p, i) => ({ label: p, data: I.salario_por_perfil_nivel.map(x => x[p] ? x[p].media : null), backgroundColor: t[cols[i]] })),
        };
      },
      extra: (i, d) => { const p = ["Não usa", "Usa só versões gratuitas", "Paga do próprio bolso", "A empresa paga"][d]; const x = I.salario_por_perfil_nivel[i][p]; return x ? `n = ${fmt.int(x.n)}` : ""; },
    },

    // ---- stack ----
    stk_linguagens: {
      title: "Linguagens usadas no dia a dia", sub: `% dos respondentes (n = ${fmt.int(K.linguagens.answered)}). Múltipla escolha.`,
      fmt: fmt.pct, build: simple(K.linguagens.items.filter(x => x.pct >= 0.5)),
    },
    stk_ling_atuacao: {
      title: "Linguagem mais usada, por área", sub: "Analistas vivem de SQL; cientistas, de Python; engenheiros dividem.",
      fmt: fmt.pct, build: stacked(K.linguagem_por_atuacao.rows, K.linguagem_por_atuacao.columns, ["s1", "s4", "s3"], { max: 100 }),
    },
    stk_cloud: {
      title: "Clouds usadas no dia a dia", sub: `% dos respondentes (n = ${fmt.int(K.cloud.answered)}). ${fmt.pct(K.multi_cloud_pct)} usam 2+ das três grandes.`,
      fmt: fmt.pct, build: simple(K.cloud.items),
    },
    stk_cloud_setor: {
      title: "Cloud por setor", sub: "% que usam cada cloud no dia a dia. Setores com 90+ respostas. Varejo é GCP; bancos são AWS; setor público ainda é on-premise.",
      fmt: fmt.pct, build: t => {
        const rows = [...K.cloud_por_setor_flags].sort((a, b) => b.AWS - a.AWS);
        return {
          labels: rows.map(x => x.label), nCol: rows.map(x => x.n), rowH: 56,
          datasets: [
            { label: "AWS", data: rows.map(x => x.AWS), backgroundColor: t.s2 },
            { label: "GCP", data: rows.map(x => x.GCP), backgroundColor: t.s1 },
            { label: "Azure", data: rows.map(x => x.Azure), backgroundColor: t.s3 },
            { label: "On-premise", data: rows.map(x => x["On-premise / sem cloud"]), backgroundColor: t.gray2 },
          ], labelFmt: fmt.pct0,
        };
      },
    },
    stk_bancos: {
      title: "Bancos de dados e armazenamento", sub: `% dos respondentes (n = ${fmt.int(K.bancos.answered)}). Top 15.`,
      fmt: fmt.pct, build: simple(K.bancos.items),
    },
    stk_bi: {
      title: "Ferramentas de BI usadas", sub: `% dos respondentes (n = ${fmt.int(K.bi.answered)}). Power BI é preferido por ${fmt.pct(derived.stack.powerbi_pref)} de quem tem preferência.`,
      fmt: fmt.pct, build: simple(K.bi.items, { highlight: (x, i) => i === 0 }),
    },
    stk_etl: {
      title: "Ferramentas de ETL/orquestração (engenheiros de dados)", sub: `% dos engenheiros de dados (n = ${fmt.int(K.etl_de.answered)}).`,
      fmt: fmt.pct, build: simple(K.etl_de.items, { color: "s3" }),
    },
    stk_dw: {
      title: "Tecnologia do data warehouse", sub: `% entre engenheiros cuja empresa tem DW (n = ${fmt.int(K.dw_tech.reduce((a, x) => a + x.n, 0))}). ${fmt.pct0(K.possui_dw)} das empresas têm DW.`,
      fmt: fmt.pct, build: simple(K.dw_tech, { color: "s3" }),
    },
    stk_lake: {
      title: "Tecnologia do data lake", sub: `% entre engenheiros cuja empresa tem lake (n = ${fmt.int(K.lake_tech.reduce((a, x) => a + x.n, 0))}). ${fmt.pct0(K.possui_lake)} das empresas têm lake.`,
      fmt: fmt.pct, build: simple(K.lake_tech, { color: "s3" }),
    },
    stk_dq: {
      title: "Ferramentas de qualidade de dados", sub: `% entre engenheiros que citaram alguma (n = ${fmt.int(K.dq_answered)}). Só ${Math.round(100 * K.dq_answered / K.etl_de.answered)}% dos engenheiros citaram uma.`,
      fmt: fmt.pct, build: simple(K.dq_tools, { color: "s3" }),
    },
    stk_ds_tecnicas: {
      title: "Técnicas usadas por cientistas de dados", sub: `% dos cientistas (n = ${fmt.int(K.ds_tecnicas.answered)}). LLMs já aparecem em ${fmt.pct0(I.llm_ds)}.`,
      fmt: fmt.pct, build: simple(K.ds_tecnicas.items.map(x => ({ ...x, label: shortDS(x.full) })), { color: "s2" }),
    },
    stk_ds_tech: {
      title: "Ferramentas de cientistas de dados", sub: `% dos cientistas (n = ${fmt.int(K.ds_tech.answered)}).`,
      fmt: fmt.pct, build: simple(K.ds_tech.items.map(x => ({ ...x, label: shortDS(x.full) })), { color: "s2" }),
    },
    stk_tempo_de: {
      title: "Onde o engenheiro de dados gasta mais tempo", sub: `% dos engenheiros (n = ${fmt.int(K.de_maior_tempo.answered)}).`,
      fmt: fmt.pct, build: simple(K.de_maior_tempo.items.map(x => ({ ...x, label: shortDS(x.full) })).filter(x => x.pct > 0), { color: "s3" }),
    },
    stk_tempo_da: {
      title: "Onde o analista de dados gasta mais tempo", sub: `% dos analistas (n = ${fmt.int(K.da_maior_tempo.answered)}). Dashboards e SQL dominam.`,
      fmt: fmt.pct, build: simple(K.da_maior_tempo.items.map(x => ({ ...x, label: shortDS(x.full) })).filter(x => x.pct > 0)),
    },
    stk_tempo_ds: {
      title: "Onde o cientista de dados gasta mais tempo", sub: `% dos cientistas (n = ${fmt.int(K.ds_maior_tempo.answered)}). Coletar e limpar dados ainda lidera.`,
      fmt: fmt.pct, build: simple(K.ds_maior_tempo.items.map(x => ({ ...x, label: shortDS(x.full) })).filter(x => x.pct > 0), { color: "s2" }),
    },

    // ---- gestores ----
    ges_desafios: {
      title: "Maiores desafios de quem lidera times de dados", sub: `% dos gestores (n = ${fmt.int(G.desafios.answered)}). Múltipla escolha.`,
      fmt: fmt.pct, build: simple(G.desafios.items, { highlight: (x, i) => i < 2 }),
    },
    ges_tamanho: {
      title: "Tamanho do time de dados", sub: "% dos gestores.",
      fmt: fmt.pct, build: simple(G.tamanho_time.map(x => ({ ...x, label: x.label.startsWith("Ainda") ? "Ainda não tem" : x.label }))),
    },
    ges_cargos: {
      title: "Cargos presentes nos times de dados", sub: `% dos gestores (n = ${fmt.int(G.cargos_time.answered)}). ML/AI Engineer já está em 41% dos times.`,
      fmt: fmt.pct, build: simple(G.cargos_time.items.map(x => ({ ...x, label: x.label.split("/")[0].trim() }))),
    },

    // ---- perfil ----
    per_idade: { title: "Faixa etária", sub: `Mediana de ${D.meta.idade_mediana} anos.`, fmt: fmt.pct, build: t => ({ indexAxis: "x", height: 220, labels: P.idade.map(x => x.label), datasets: [{ label: "", data: P.idade.map(x => x.pct), backgroundColor: t.s1 }], tick: v => v + "%", nCol: P.idade.map(x => x.n), labelFmt: fmt.pct0 }) },
    per_regiao: { title: "Região onde mora", sub: "% dos respondentes.", fmt: fmt.pct, build: simple(P.regiao) },
    per_atuacao: { title: "Atuação", sub: "% dos respondentes.", fmt: fmt.pct, build: simple(P.atuacao) },
    per_cargo: { title: "Cargo atual (não gestores)", sub: "% dos que informaram cargo.", fmt: fmt.pct, build: simple(P.cargo) },
    per_formacao: { title: "Área de formação", sub: "% dos respondentes.", fmt: fmt.pct, build: simple(P.formacao) },
    per_setor: { title: "Setor da empresa", sub: "% dos empregados.", fmt: fmt.pct, build: simple(P.setor) },
    per_tamanho: { title: "Tamanho da empresa (funcionários)", sub: "% dos empregados.", fmt: fmt.pct, build: simple(P.tamanho) },
    per_situacao: { title: "Situação de trabalho", sub: "% dos respondentes.", fmt: fmt.pct, build: simple(P.situacao.filter(x => x.pct >= 0.5)) },
  };

  function shortLabel(s) {
    const exact = {
      "Oportunidade de aprendizado e trabalhar com referências": "Aprendizado e trabalhar com referências",
      "Maturidade da empresa em termos de tecnologia e dados": "Maturidade em tecnologia e dados",
      "Plano de carreira e oportunidades de crescimento": "Plano de carreira e crescimento",
      "Propósito do trabalho e da empresa": "Propósito do trabalho",
      "Reputação que a empresa tem no mercado": "Reputação da empresa",
      "Relação com os gestores e líderes": "Relação com gestores",
      "Qualidade dos gestores e líderes": "Qualidade dos gestores",
      "Atenção dada pelas pessoas diante das minhas opiniões e ideias": "Atenção às minhas opiniões e ideias",
      "Senioridade das vagas recebidas em relação à sua experiência": "Senioridade das vagas recebidas",
      "Quantidade de oportunidades de emprego/vagas recebidas": "Quantidade de vagas recebidas",
      "Relação com outras pessoas da empresa, em momentos de trabalho": "Relações no trabalho",
      "Relação com outras pessoas da empresa, em momentos de integração e outros momentos fora do trabalho": "Relações fora do trabalho",
      "Nível de cobrança no trabalho/Stress no trabalho": "Cobrança e stress no trabalho",
      "Aprovação em processos seletivos/entrevistas": "Aprovação em processos seletivos",
      "Retorno sobre investimento (ROI) não comprovado de IA Generativa": "ROI não comprovado",
      "Dados da empresa não estão prontos para uso de IA Generativa": "Dados da empresa não estão prontos",
      "Alta direção da empresa não vê valor ou não vê como prioridade": "Alta direção não vê valor",
      "Falta de confiabilidade das saídas (alucinação dos modelos)": "Alucinação / falta de confiabilidade",
      "Preocupações com segurança e privacidade de dados": "Segurança e privacidade de dados",
      "Preocupações com propriedade intelectual": "Propriedade intelectual",
      "Incerteza em relação a regulamentação": "Incerteza regulatória",
      "Gestão de projetos envolvendo áreas multidisciplinares": "Projetos multidisciplinares",
      "Organizar as informações com qualidade e confiabilidade": "Qualidade e confiabilidade da informação",
      "Desenvolver e manter modelos Machine Learning em produção": "Manter modelos de ML em produção",
      "Garantir a manutenção dos projetos e modelos em produção": "Manutenção de projetos em produção",
      "Dividir o tempo entre entregas técnicas e gestão": "Dividir tempo entre técnica e gestão",
      "Garantir (ROI) em projetos de dados": "Garantir ROI em projetos de dados",
      "Conseguir levar inovação para a empresa": "Levar inovação para a empresa",
      "Processar e armazenar um alto volume de dados": "Processar alto volume de dados",
      "Convencer a empresa a aumentar investimentos": "Convencer a aumentar investimentos",
      "Gestão de equipes no ambiente remoto": "Gestão de equipes remotas",
      "Uso descentralizado pelos colaboradores": "Uso descentralizado pelos colaboradores",
      "Dados relacionais (estruturados em bancos SQL)": "Dados relacionais (SQL)",
      "Dados armazenados em bancos NoSQL": "Bancos NoSQL",
    };
    if (exact[s]) return exact[s];
    return shortDS(s);
  }
  function shortDS(s) {
    const map = [
      [/^Utilizo modelos de regressão/, "Regressão (linear, logística, GLM)"],
      [/^Utilizo redes neurais ou modelos baseados em árvore/, "Redes neurais / árvores (classificação)"],
      [/^Utilizo métodos estatísticos clássicos/, "Estatística clássica (testes, multivariada)"],
      [/^Desenvolvo técnicas de Clusterização/, "Clusterização"],
      [/^Realizo previsões através de modelos de Séries Temporais/, "Séries temporais"],
      [/^Utilizo técnicas de NLP/, "NLP"],
      [/^Utilizo LLM/, "LLMs para problemas de negócio"],
      [/^Utilizo modelos de Detecção de Churn/, "Detecção de churn"],
      [/^Desenvolvo sistemas de recomendação/, "Sistemas de recomendação"],
      [/^Utilizo modelos de Machine Learning para detecção de fraude/, "Detecção de fraude"],
      [/^Utilizo métodos estatísticos Bayesianos/, "Métodos bayesianos"],
      [/^Utilizo métodos de Visão Computacional/, "Visão computacional"],
      [/^Utilizo cadeias de Markov/, "Cadeias de Markov / HMM"],
      [/^Utilizo modelos de Reinforcement Learning/, "Reinforcement learning"],
      [/^Ambientes de desenvolvimento local/, "Ambiente local (Jupyter, RStudio)"],
      [/^Planilhas/, "Planilhas"],
      [/^Sistemas de controle de versão/, "Controle de versão (Git, DVC)"],
      [/^Ambientes de desenvolvimento na nuvem/, "Notebooks na nuvem (Colab, SageMaker)"],
      [/^Ferramentas de BI/, "Ferramentas de BI"],
      [/^Plataformas de Machine Learning/, "Plataformas de ML (TensorFlow, Kubeflow)"],
      [/^Ferramentas de ETL/, "Ferramentas de ETL (Airflow, NiFi)"],
      [/^Plataformas de Data Apps/, "Data apps (Streamlit, Shiny, Dash)"],
      [/^Feature Store/, "Feature store"],
      [/^Ferramentas de AutoML/, "AutoML"],
      [/^Ferramentas de estatística avançada/, "SPSS / SAS"],
      [/^Desenvolvendo pipelines de dados utilizando linguagens/, "Pipelines em Python / Scala / Java"],
      [/^Criando consultas através da linguagem SQL/, "Consultas SQL para as áreas"],
      [/^Modelando soluções de arquitetura de dados/, "Arquitetura de dados (ingestão, transformação)"],
      [/^Atuando na modelagem dos dados/, "Modelagem (DW, data marts)"],
      [/^Realizando construções de ETL/, "ETL em ferramentas (Pentaho, Talend, Dataflow)"],
      [/^Atuando na integração de diferentes fontes/, "Integração de fontes (Stitch, Fivetran)"],
      [/^Desenvolvendo\/cuidando da manutenção de repositórios de dados baseados em streaming/, "Streaming (Kafka, Kinesis)"],
      [/^Cuidando da qualidade dos dados/, "Qualidade de dados e metadados"],
      [/^Nenhuma das opções/, "Nenhuma das opções"],
      [/^Realizando construções de dashboards/, "Dashboards em BI"],
      [/^Processando e analisando dados utilizando linguagens/, "Análise em Python / R"],
      [/^Utilizando API/, "APIs para extrair dados"],
      [/^Realizando experimentos e estudos utilizando metodologias estatísticas/, "Experimentos e testes estatísticos"],
      [/^Desenvolvendo\/cuidando da manutenção de ETL/, "ETL (Talend, Pentaho, Airflow)"],
      [/^Desenvolvendo\/cuidando da manutenção de planilhas/, "Planilhas para as áreas"],
      [/^Utilizando ferramentas avançadas de estatística/, "SAS / SPSS / Stata"],
      [/^Coletando e limpando/, "Coletar e limpar dados"],
      [/^Estudos Ad-hoc/, "Estudos ad-hoc (hipóteses, forecasts)"],
      [/^Desenvolvendo modelos de Machine Learning/, "Modelos de ML para produção"],
      [/^Entrando em contato com os times de negócio/, "Definir problema com o negócio"],
      [/^Colocando modelos em produção/, "Colocar modelos em produção (MLOps)"],
      [/^Cuidando da manutenção de modelos/, "Manter modelos em produção"],
      [/^Criando e dando manutenção em ETLs/, "ETLs, DAGs e automações"],
      [/^Criando e gerenciando soluções de Feature Store/, "Feature store e cultura MLOps"],
      [/^Criando e mantendo a infra/, "Infra dos modelos (clusters, APIs)"],
      [/^Treinando e aplicando LLM/, "Treinar e aplicar LLMs"],
    ];
    for (const [re, lab] of map) if (re.test(s)) return lab;
    return s.length > 44 ? s.slice(0, 43) + "…" : s;
  }

  // ---------- montar ----------
  document.querySelectorAll("[data-chart]").forEach(el => {
    const spec = specs[el.dataset.chart];
    if (!spec) { el.innerHTML = `<p class="sub">gráfico ${el.dataset.chart} não definido</p>`; return; }
    try { card(el, spec); } catch (e) { console.error(el.dataset.chart, e); el.innerHTML = `<p class="sub">erro em ${el.dataset.chart}: ${esc(e.message)}</p>`; }
  });

  // nav ativa
  const links = [...document.querySelectorAll(".nav a")];
  const obs = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + en.target.id)); });
  }, { rootMargin: "-30% 0px -60% 0px" });
  document.querySelectorAll("section[id]").forEach(s => obs.observe(s));
})();
