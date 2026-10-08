"""
Gera docs/data.js a partir do dataset State of Data Brazil 2024/2025 (Data Hackers, Kaggle).

Uso:
    pip install -r requirements.txt
    python analysis/build_data.py            # baixa via kagglehub
    python analysis/build_data.py caminho.csv  # usa um CSV local
"""
import json
import sys
import glob
import datetime as dt
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "data.js"


def load() -> pd.DataFrame:
    if len(sys.argv) > 1:
        path = sys.argv[1]
    else:
        import kagglehub
        d = kagglehub.dataset_download("datahackers/state-of-data-brazil-20242025")
        path = glob.glob(f"{d}/*.csv")[0]
    return pd.read_csv(path, low_memory=False)


df = load()
N = len(df)

# ---------- helpers ----------
def col(prefix: str) -> str:
    m = [c for c in df.columns if c.startswith(prefix)]
    if not m:
        raise KeyError(prefix)
    return m[0]


def cols(prefix: str) -> list[str]:
    return [c for c in df.columns if c.startswith(prefix)]


def label_of(c: str) -> str:
    # "4.d.3_Python" -> "Python" ; "3.g.1 Falta..." -> "Falta..."
    body = c.split("_", 1)[1] if "_" in c.split(" ", 1)[0] else c.split(" ", 1)[1]
    return body.strip()


def r(x, nd=1):
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return None
    return round(float(x), nd)


def counts(series: pd.Series, order=None, top=None, min_n=0):
    vc = series.dropna().value_counts()
    if order:
        vc = vc.reindex([o for o in order if o in vc.index]).dropna()
    if top:
        vc = vc.head(top)
    total = int(series.notna().sum())
    return [
        {"label": str(k).replace("\\", ""), "n": int(v), "pct": r(100 * v / total)}
        for k, v in vc.items() if v >= min_n
    ]


def flags(prefix: str, base: pd.DataFrame | None = None, rename=None, top=None, min_pct=0):
    """Percentual de respondentes (que responderam ao bloco) que marcaram cada opcao."""
    base = df if base is None else base
    cs = cols(prefix)
    sub = base[cs]
    answered = int(sub.notna().any(axis=1).sum())
    rows = []
    for c in cs:
        v = pd.to_numeric(sub[c], errors="coerce")
        n = int(v.sum())
        lab = label_of(c)
        if rename and lab in rename:
            lab = rename[lab]
        rows.append({"label": lab, "n": n, "pct": r(100 * n / answered) if answered else 0})
    rows = sorted(rows, key=lambda x: -x["n"])
    rows = [x for x in rows if x["pct"] >= min_pct]
    if top:
        rows = rows[:top]
    return {"answered": answered, "items": rows}


def pct_table(index: pd.Series, columns: pd.Series, col_order=None, min_n=30):
    ct = pd.crosstab(index, columns)
    if col_order:
        ct = ct[[c for c in col_order if c in ct.columns]]
    ct = ct[ct.sum(axis=1) >= min_n]
    tot = ct.sum(axis=1)
    out = []
    for idx, row in ct.iterrows():
        out.append({
            "label": str(idx), "n": int(tot[idx]),
            "values": {str(c): r(100 * row[c] / tot[idx]) for c in ct.columns},
        })
    return {"columns": [str(c) for c in ct.columns], "rows": out}


# ---------- salario ----------
SAL_ORDER = [
    "Menos de R$ 1.000/mês", "de R$ 1.001/mês a R$ 2.000/mês", "de R$ 2.001/mês a R$ 3.000/mês",
    "de R$ 3.001/mês a R$ 4.000/mês", "de R$ 4.001/mês a R$ 6.000/mês", "de R$ 6.001/mês a R$ 8.000/mês",
    "de R$ 8.001/mês a R$ 12.000/mês", "de R$ 12.001/mês a R$ 16.000/mês", "de R$ 16.001/mês a R$ 20.000/mês",
    "de R$ 20.001/mês a R$ 25.000/mês", "de R$ 25.001/mês a R$ 30.000/mês", "de R$ 30.001/mês a R$ 40.000/mês",
    "Acima de R$ 40.001/mês",
]
SAL_MID = dict(zip(SAL_ORDER, [500, 1500, 2500, 3500, 5000, 7000, 10000, 14000, 18000, 22500, 27500, 35000, 45000]))
SAL_SHORT = dict(zip(SAL_ORDER, ["< 1k", "1–2k", "2–3k", "3–4k", "4–6k", "6–8k", "8–12k", "12–16k", "16–20k", "20–25k", "25–30k", "30–40k", "> 40k"]))

C_SAL = col("2.h_")
C_SIT = col("2.a_")
C_CARGO = col("2.f_")
C_NIVEL = col("2.g_")
C_GEN = col("1.b_")
C_RACA = col("1.c_")
C_REG = col("1.i.2_")
C_UF = col("1.i.1_")
C_ENS = col("1.l_")
C_FORM = col("1.m_")
C_EXP = col("2.i_")
C_MODELO = col("2.r_")
C_IDEAL = col("2.s_")
C_ATIT = col("2.t_")
C_SAT = col("2.k_")
C_PLANOS = col("2.n_")
C_ENTREV = col("2.m_")
C_LAYOFF = col("2.q_")
C_SETOR = col("2.b_")
C_TAM = col("2.c_")
C_GESTOR = col("2.d_")
C_CARGO_G = col("2.e_")
C_ATUA = col("4.a.1_")
C_IDADE_F = col("1.a.1_")
C_PCD = col("1.d_")

df["sal"] = df[C_SAL].map(SAL_MID)
df["mulher"] = df[C_GEN].eq("Feminino")

WORKING = [
    "Empregado (CLT)", "Empreendedor ou Empregado (CNPJ)", "Servidor Público",
    "Vivo no Brasil e trabalho remoto para empresa de fora do Brasil",
    "Vivo fora do Brasil e trabalho para empresa de fora do Brasil", "Freelancer",
]
w = df[df[C_SIT].isin(WORKING) & df["sal"].notna()].copy()
emp = df[df[C_SAT].notna()].copy()  # todos que responderam o bloco de trabalho


def sal_by(colname, base=w, min_n=30, order=None, short=None):
    g = base.groupby(colname)["sal"]
    t = pd.DataFrame({
        "n": g.count(), "media": g.mean(), "mediana": g.median(),
        "p25": g.quantile(0.25), "p75": g.quantile(0.75),
        "acima12k": g.apply(lambda s: 100 * (s > 12000).mean()),
    })
    t = t[t["n"] >= min_n]
    if order:
        t = t.reindex([o for o in order if o in t.index])
    else:
        t = t.sort_values("media", ascending=False)
    return [
        {"label": short.get(str(k), str(k)) if short else str(k), "n": int(v.n), "media": r(v.media, 0),
         "mediana": r(v.mediana, 0), "p25": r(v.p25, 0), "p75": r(v.p75, 0), "acima12k": r(v.acima12k)}
        for k, v in t.iterrows()
    ]


CARGO_SHORT = {
    "Engenheiro de Machine Learning/ML Engineer/AI Engineer": "ML / AI Engineer",
    "Arquiteto de Dados/Data Architect": "Arquiteto de Dados",
    "Engenheiro de Dados/Data Engineer/Data Architect": "Engenheiro de Dados",
    "Cientista de Dados/Data Scientist": "Cientista de Dados",
    "Data Product Manager/ Product Manager (PM/APM/DPM/GPM/PO)": "Data Product Manager",
    "Analytics Engineer": "Analytics Engineer",
    "Desenvolvedor/ Engenheiro de Software/ Analista de Sistemas": "Eng. de Software",
    "Analista de Negócios/Business Analyst": "Business Analyst",
    "Analista de Dados/Data Analyst": "Analista de Dados",
    "Analista de BI/BI Analyst": "Analista de BI",
    "Analista de Suporte/Analista Técnico": "Analista de Suporte",
    "Outra Opção": "Outros",
}
SIT_SHORT = {
    "Vivo no Brasil e trabalho remoto para empresa de fora do Brasil": "No Brasil, remoto p/ exterior",
    "Vivo fora do Brasil e trabalho para empresa de fora do Brasil": "Fora do Brasil, empresa de fora",
    "Empreendedor ou Empregado (CNPJ)": "PJ / CNPJ",
    "Empregado (CLT)": "CLT",
    "Servidor Público": "Servidor público",
    "Freelancer": "Freelancer",
}
MODELO_SHORT = {
    "Modelo 100% remoto": "100% remoto",
    "Modelo híbrido flexível (o funcionário tem liberdade para escolher quando estar no escritório presencialmente)": "Híbrido flexível",
    "Modelo híbrido com dias fixos de trabalho presencial": "Híbrido com dias fixos",
    "Modelo 100% presencial": "100% presencial",
}
MODELO_ORDER = list(MODELO_SHORT.keys())
NIVEL_ORDER = ["Júnior", "Pleno", "Sênior"]
EXP_ORDER = ["Não tenho experiência na área de dados", "Menos de 1 ano", "de 1 a 2 anos", "de 3 a 4 anos", "de 5 a 6 anos", "de 7 a 10 anos", "Mais de 10 anos"]
EXP_SHORT = dict(zip(EXP_ORDER, ["Sem experiência", "< 1 ano", "1–2 anos", "3–4 anos", "5–6 anos", "7–10 anos", "> 10 anos"]))
ENS_ORDER = ["Não tenho graduação formal", "Estudante de Graduação", "Graduação/Bacharelado", "Pós-graduação", "Mestrado", "Doutorado ou Phd"]
ENS_SHORT = dict(zip(ENS_ORDER, ["Sem graduação", "Estudante", "Graduação", "Pós-graduação", "Mestrado", "Doutorado"]))
TAM_ORDER = ["de 1 a 5", "de 6 a 10", "de 11 a 50", "de 51 a 100", "de 101 a 500", "de 501 a 1.000", "de 1.001 a 3.000", "Acima de 3.000"]
TAM_SHORT = dict(zip(TAM_ORDER, ["1–5", "6–10", "11–50", "51–100", "101–500", "501–1.000", "1.001–3.000", "> 3.000"]))
RACA_ORDER = ["Branca", "Parda", "Preta", "Amarela", "Indígena"]
CARGO_G_ORDER = ["Team Leader/Tech Leader", "Supervisor/Coordenador", "Gerente/Head", "Diretor/VP", "Sócio ou C-level (CEO, CDO, CIO, CTO etc)"]
CARGO_G_SHORT = dict(zip(CARGO_G_ORDER, ["Tech Lead", "Supervisor / Coord.", "Gerente / Head", "Diretor / VP", "Sócio / C-level"]))
ATIT_SHORT = {
    "Vou aceitar e retornar ao modelo 100% presencial": "Aceita voltar",
    "Vou procurar outra oportunidade no modelo híbrido ou remoto": "Procura vaga híbrida ou remota",
    "Vou procurar outra oportunidade no modelo 100% remoto": "Procura vaga 100% remota",
}
PLANOS_SHORT = {
    "Não estou buscando e não pretendo mudar de emprego nos próximos 6 meses": "Não busca, não pretende mudar",
    "Não estou buscando, mas me considero aberto a outras oportunidades": "Não busca, mas está aberto",
    "Estou em busca de oportunidades dentro ou fora do Brasil": "Buscando (Brasil ou exterior)",
    "Estou em busca de oportunidades, mas apenas fora do Brasil": "Buscando apenas no exterior",
}
LAYOFF_SHORT = {
    "Não ocorreram layoffs/demissões em massa na empresa em que trabalho": "Sem layoff",
    "Sim, ocorreram layoffs/demissões em massa na empresa em que trabalho mas não fui afetado": "Houve layoff, não fui afetado",
    "Sim, ocorreram layoffs/demissões em massa na empresa em que trabalhava e eu fui afetado": "Houve layoff e fui afetado",
}
ENTREV_SHORT = {
    "Não participei de entrevistas de emprego/processos seletivos nos últimos 6 meses": "Não fez entrevistas",
    "Sim, fiz entrevistas mas não fui aprovado (ou ainda aguardo resposta)": "Fez, não aprovado / aguardando",
    "Sim, fui aprovado e mudei de emprego": "Aprovado e mudou de emprego",
    "Sim, fui aprovado mas decidi não mudar de emprego": "Aprovado, mas não mudou",
    "Sim, fui aprovado no meu primeiro emprego (ou estava sem emprego)": "Aprovado no 1º emprego",
}
PRIO_SHORT = {
    "Sim, é nossa principal prioridade como empresa (com foco executivo significativo e alocação de orçamento relevante).": "Principal prioridade da empresa",
    "Sim, está entre nossas principais prioridades para os próximos 2-4 anos (com discussões de iniciativas e orçamentos de curto a médio prazo).": "Entre as principais prioridades (2–4 anos)",
    "Mais ou menos... É uma das várias iniciativas que estamos impulsionando, mas não é uma prioridade (tratam-se de iniciativas isoladas e com pouco foco).": "Iniciativas isoladas, sem prioridade",
    "Não é uma iniciativa que estamos focando e não tem sido uma prioridade.": "Não é prioridade",
    "Não sei opinar sobre esse assunto.": "Não sabe opinar",
}
PRIO_ORDER = list(PRIO_SHORT.keys())
FORM_SHORT = {
    "Computação / Engenharia de Software / Sistemas de Informação/ TI": "Computação / TI",
    "Outras Engenharias (não incluir engenharia de software ou TI)": "Outras engenharias",
    "Economia/ Administração / Contabilidade / Finanças/ Negócios": "Economia / Adm / Negócios",
    "Estatística/ Matemática / Matemática Computacional/ Ciências Atuariais": "Estatística / Matemática",
    "Marketing / Publicidade / Comunicação / Jornalismo / Ciências Sociais": "Marketing / Comunicação / Sociais",
    "Ciências Biológicas/ Farmácia/ Medicina/ Área da Saúde": "Saúde / Biológicas",
    "Química / Física": "Química / Física",
    "Outra opção": "Outra",
}


def rename_items(items, mapping):
    for it in items:
        it["label"] = mapping.get(it["label"], it["label"])
    return items


# ---------- gap de genero / raca ----------
def gap_by(groupcol, order=None, short=None, min_n=25):
    out = []
    g = w.groupby([groupcol, C_GEN])["sal"].agg(["mean", "count"]).unstack()
    keys = order or list(g.index)
    for k in keys:
        if k not in g.index:
            continue
        try:
            mf, nf = g.loc[k, ("mean", "Feminino")], g.loc[k, ("count", "Feminino")]
            mm, nm = g.loc[k, ("mean", "Masculino")], g.loc[k, ("count", "Masculino")]
        except KeyError:
            continue
        if nf < min_n or nm < min_n:
            continue
        out.append({"label": short.get(str(k), str(k)) if short else str(k), "fem": r(mf, 0), "masc": r(mm, 0),
                    "n_fem": int(nf), "n_masc": int(nm), "gap_pct": r(100 * (mf - mm) / mm)})
    return out


def gap_raca_by(groupcol, order=None, short=None, min_n=25):
    out = []
    g = w.groupby([groupcol, C_RACA])["sal"].agg(["mean", "count"]).unstack()
    keys = order or list(g.index)
    for k in keys:
        if k not in g.index:
            continue
        row = {"label": short.get(str(k), str(k)) if short else str(k)}
        ok = False
        for rc in ["Branca", "Parda", "Preta"]:
            try:
                m, n = g.loc[k, ("mean", rc)], g.loc[k, ("count", rc)]
            except KeyError:
                continue
            if n >= min_n:
                row[rc] = r(m, 0); row["n_" + rc] = int(n); ok = True
        if ok and "Branca" in row:
            for rc in ["Parda", "Preta"]:
                if rc in row:
                    row["gap_" + rc] = r(100 * (row[rc] - row["Branca"]) / row["Branca"])
            out.append(row)
    return out


def share_women(groupcol, base, order=None, short=None, min_n=30):
    g = base.groupby(groupcol).agg(n=("mulher", "size"), mulheres=("mulher", "sum"))
    g = g[g.n >= min_n]
    keys = order or list(g.index)
    return [{"label": short.get(str(k), str(k)) if short else str(k), "n": int(g.loc[k, "n"]),
             "pct": r(100 * g.loc[k, "mulheres"] / g.loc[k, "n"])} for k in keys if k in g.index]


def share_race(groupcol, base, order=None, short=None, min_n=30):
    ct = pd.crosstab(base[groupcol], base[C_RACA])
    ct = ct[ct.sum(axis=1) >= min_n]
    keys = order or list(ct.index)
    out = []
    for k in keys:
        if k not in ct.index:
            continue
        tot = ct.loc[k].sum()
        out.append({"label": short.get(str(k), str(k)) if short else str(k), "n": int(tot),
                    **{rc: r(100 * ct.loc[k].get(rc, 0) / tot) for rc in RACA_ORDER}})
    return out


# base para "funil" de carreira: todos com nivel ou cargo de gestao
car = emp.copy()
car["estagio"] = np.where(car[C_GESTOR] == True, car[C_CARGO_G], car[C_NIVEL])
ESTAGIO_ORDER = NIVEL_ORDER + CARGO_G_ORDER
ESTAGIO_SHORT = {**{k: k for k in NIVEL_ORDER}, **CARGO_G_SHORT}

# ---------- IA generativa ----------
IA_USO_SHORT = {
    "Não uso soluções de AI Generativa com foco em produtividade": "Não usa",
    "Uso soluções gratuitas de AI Generativa com foco em produtividade": "Usa só versões gratuitas",
    "Uso e pago pelas soluções de AI Generativa com foco em produtividade": "Paga do próprio bolso",
    "A empresa que trabalho paga pelas soluções de AI Generativa com foco em produtividade": "A empresa paga",
    "Uso soluções do tipo Copilot": "Usa Copilot (código)",
}
IA_EMP_SHORT = {
    "Colaboradores usando AI generativa de forma independente e descentralizada": "Uso descentralizado pelos colaboradores",
    "Direcionamento centralizado do uso de AI generativa": "Direcionamento centralizado",
    "Desenvolvedores utilizando Copilots": "Devs usando Copilots",
    "AI Generativa e LLMs para melhorar produtos externos para os clientes finais": "LLMs em produtos para clientes",
    "AI Generativa e LLMs para melhorar produtos internos para os colaboradores": "LLMs em produtos internos",
    "IA Generativa e LLMs como principal frente do negócio": "IA é a principal frente do negócio",
    "IA Generativa e LLMs não é prioridade": "Não é prioridade",
    "Não sei opinar sobre o uso de IA Generativa e LLMs na empresa": "Não sabe opinar",
}
ia_cols = cols("4.m.")
ia = df[df[ia_cols].notna().any(axis=1)].copy()
ia["usa_ia"] = ia[ia_cols[0]].astype(float).eq(0)
ia["paga_alguem"] = (ia[ia_cols[2]].astype(float) + ia[ia_cols[3]].astype(float)) > 0
ia["copilot"] = ia[ia_cols[4]].astype(float).eq(1)


def ia_by(groupcol, order=None, short=None, min_n=30):
    g = ia.groupby(groupcol).agg(n=("usa_ia", "size"), usa=("usa_ia", "mean"), paga=("paga_alguem", "mean"),
                                 copilot=("copilot", "mean"),
                                 empresa_paga=(ia_cols[3], lambda s: s.astype(float).mean()),
                                 proprio=(ia_cols[2], lambda s: s.astype(float).mean()),
                                 gratis=(ia_cols[1], lambda s: s.astype(float).mean()))
    g = g[g.n >= min_n]
    keys = order or list(g.sort_values("paga", ascending=False).index)
    return [{"label": short.get(str(k), str(k)) if short else str(k), "n": int(g.loc[k, "n"]),
             "usa": r(100 * g.loc[k, "usa"]), "paga": r(100 * g.loc[k, "paga"]), "copilot": r(100 * g.loc[k, "copilot"]),
             "empresa_paga": r(100 * g.loc[k, "empresa_paga"]), "proprio": r(100 * g.loc[k, "proprio"]),
             "gratis": r(100 * g.loc[k, "gratis"])} for k in keys if k in g.index]


# salario por "perfil de uso de IA" (apenas nao-gestores com nivel, para reduzir confusao com senioridade)
iaw = ia[ia["sal"].notna() & ia[C_NIVEL].notna()].copy()
iaw["perfil"] = np.select(
    [iaw[ia_cols[0]].astype(float).eq(1), iaw[ia_cols[3]].astype(float).eq(1), iaw[ia_cols[2]].astype(float).eq(1)],
    ["Não usa", "A empresa paga", "Paga do próprio bolso"], default="Usa só versões gratuitas")
ia_sal_nivel = []
for nv in NIVEL_ORDER:
    sub = iaw[iaw[C_NIVEL] == nv]
    g = sub.groupby("perfil")["sal"].agg(["mean", "count"])
    ia_sal_nivel.append({"nivel": nv, **{k: {"media": r(v["mean"], 0), "n": int(v["count"])} for k, v in g.iterrows() if v["count"] >= 20}})

# ---------- stack ----------
LANG_RENAME = {"Não utilizo nenhuma das linguagens listadas": "Nenhuma"}
BI_RENAME = {
    "Fazemos todas as análises utilizando apenas Excel ou planilhas do google": "Só Excel / planilhas",
    "Não utilizo nenhuma ferramenta de BI no trabalho": "Nenhuma ferramenta de BI",
    "Looker Studio(Google Data Studio)": "Looker Studio",
    "Qlik View/Qlik Sense": "Qlik",
    "SAP Business Objects/SAP Analytics": "SAP BO / Analytics",
}
CLOUD_RENAME = {"Servidores On Premise/Não utilizamos Cloud": "On-premise / sem cloud", "Amazon Web Services (AWS)": "AWS", "Google Cloud (GCP)": "GCP", "Azure (Microsoft)": "Azure"}
ETL_RENAME = {"Não utilizo ferramentas de ETL": "Nenhuma", "SQL Server Integration Services (SSIS)": "SSIS"}

de = df[df[C_ATUA] == "Engenharia de Dados"]
da = df[df[C_ATUA] == "Análise de Dados"]
ds = df[df[C_ATUA] == "Ciência de Dados"]
ges = df[df[C_ATUA] == "Gestor"]


def short_label(s, n=52):
    s = s.replace("\\", "")
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def flags_short(prefix, base=None, top=None, n=60, rename=None):
    f = flags(prefix, base, rename=rename, top=top)
    for it in f["items"]:
        it["full"] = it["label"].replace("\\", "")
        it["label"] = short_label(it["label"], n)
    return f


# cloud: multi-cloud
cloud_cols = cols("4.h.")
cl = df[df[cloud_cols].notna().any(axis=1)]
big3 = cl[[c for c in cloud_cols if any(k in c for k in ["AWS", "GCP", "Azure"])]].astype(float)
multi = int((big3.sum(axis=1) >= 2).sum())
only_onprem = int((cl[col("4.h.6_")].astype(float).eq(1) & big3.sum(axis=1).eq(0)).sum())

# linguagem preferida vs mais usada
C_LMAIS = col("4.e_")
C_LPREF = col("4.f_")
lang_pref_mais = pct_table(df[C_LMAIS].where(df[C_LMAIS].isin(["SQL", "Python", "R"])), df[C_LPREF].where(df[C_LPREF].isin(["SQL", "Python", "R"])), col_order=["Python", "SQL", "R"], min_n=50)

# ---------- motivos / criterios ----------
MOT_RENAME = {"Gostaria de trabalhar em outra área": "Quer trabalhar em outra área"}

# ---------- perfil ----------
idade_order = ["17-21", "22-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54", "55+"]
SIT_ALL_SHORT = {**SIT_SHORT, "Desempregado, buscando recolocação": "Desempregado, buscando", "Estagiário": "Estagiário",
                 "Somente Estudante (graduação)": "Só estudante", "Trabalho na área Acadêmica/Pesquisador": "Academia / pesquisa",
                 "Somente Estudante (pós-graduação)": "Só estudante (pós)", "Prefiro não informar": "Não informou",
                 "Desempregado e não estou buscando recolocação": "Desempregado, não busca"}
SETOR_SHORT = {"Tecnologia/Fábrica de Software": "Tecnologia / software", "Finanças ou Bancos": "Finanças / bancos", "Área de Consultoria": "Consultoria", "Área da Saúde": "Saúde", "Outra Opção": "Outros", "Internet/Ecommerce": "Internet / e-commerce", "Setor Alimentício": "Alimentício", "Setor Público": "Setor público", "Setor de Energia": "Energia", "Setor Imobiliário/ Construção Civil": "Imobiliário / construção", "Seguros ou Previdência": "Seguros", "Entretenimento ou Esportes": "Entretenimento", "Setor Automotivo": "Automotivo"}

# ---------- impacto percebido (1.e / 1.f) ----------
prej_cols = cols("1.e.")
prej = df[df[prej_cols].notna().any(axis=1)]
prej_by_group = []
for name, mask in [("Mulheres", prej[C_GEN] == "Feminino"), ("Homens", prej[C_GEN] == "Masculino"),
                   ("Pessoas pretas", prej[C_RACA] == "Preta"), ("Pessoas pardas", prej[C_RACA] == "Parda"),
                   ("Pessoas brancas", prej[C_RACA] == "Branca"), ("PCD", prej[C_PCD] == "Sim")]:
    sub = prej[mask]
    prej_by_group.append({"label": name, "n": int(len(sub)),
                          "nao_afetado": r(100 * sub[col("1.e.1_")].astype(float).mean()),
                          "raca": r(100 * sub[col("1.e.2_")].astype(float).mean()),
                          "genero": r(100 * sub[col("1.e.3_")].astype(float).mean()),
                          "pcd": r(100 * sub[col("1.e.4_")].astype(float).mean())})

# ---------- layoff ----------
lay = emp.copy()
lay["houve"] = lay[C_LAYOFF].str.startswith("Sim")
lay_setor = lay.groupby(C_SETOR).agg(n=("houve", "size"), pct=("houve", "mean"))
lay_setor = lay_setor[lay_setor.n >= 70].sort_values("pct", ascending=False)
lay_setor_items = [{"label": SETOR_SHORT.get(k, k), "n": int(v.n), "pct": r(100 * v.pct)} for k, v in lay_setor.iterrows() if k != "Outra Opção"]

# satisfacao por layoff
sat_layoff = [{"label": LAYOFF_SHORT[k], "n": int(len(g)), "pct": r(100 * g[C_SAT].astype(bool).mean())}
              for k, g in emp.groupby(C_LAYOFF) if k in LAYOFF_SHORT]
# busca de emprego por layoff
busca_layoff = [{"label": LAYOFF_SHORT[k], "n": int(len(g)), "pct": r(100 * g[C_PLANOS].str.startswith("Estou em busca").mean())}
                for k, g in emp.groupby(C_LAYOFF) if k in LAYOFF_SHORT]

# ---------- montar saida ----------
data = {
    "meta": {
        "n": int(N), "n_trabalhando": int(len(w)), "n_emprego": int(len(emp)),
        "gerado_em": dt.date.today().isoformat(),
        "fonte": "State of Data Brazil 2024/2025 — Data Hackers (Kaggle: datahackers/state-of-data-brazil-20242025)",
        "idade_media": r(df[col("1.a_")].mean()), "idade_mediana": r(df[col("1.a_")].median(), 0),
    },
    "kpi": {
        "pct_mulheres": r(100 * df["mulher"].mean()),
        "pct_remoto": r(100 * emp[C_MODELO].eq("Modelo 100% remoto").mean()),
        "pct_presencial": r(100 * emp[C_MODELO].eq("Modelo 100% presencial").mean()),
        "pct_quer_remoto_ou_hibrido": r(100 * emp[C_IDEAL].ne("Modelo 100% presencial").mean()),
        "pct_sai_se_voltar": r(100 * emp[C_ATIT].str.startswith("Vou procurar").mean()),
        "pct_usa_ia": r(100 * ia["usa_ia"].mean()),
        "pct_empresa_paga_ia": r(100 * ia[ia_cols[3]].astype(float).mean()),
        "pct_satisfeito": r(100 * emp[C_SAT].astype(bool).mean()),
        "pct_buscando": r(100 * emp[C_PLANOS].str.startswith("Estou em busca").mean()),
        "pct_buscando_so_exterior": r(100 * emp[C_PLANOS].eq("Estou em busca de oportunidades, mas apenas fora do Brasil").mean()),
        "pct_layoff": r(100 * lay["houve"].mean()),
        "pct_layoff_afetado": r(100 * emp[C_LAYOFF].str.endswith("eu fui afetado").mean()),
        "mediana_salarial": r(w["sal"].median(), 0),
        "media_salarial": r(w["sal"].mean(), 0),
        "pct_sudeste": r(100 * df[C_REG].eq("Sudeste").mean()),
        "pct_pretos_pardos": r(100 * df[C_RACA].isin(["Preta", "Parda"]).mean()),
        "pct_pos": r(100 * df[C_ENS].isin(["Pós-graduação", "Mestrado", "Doutorado ou Phd"]).mean()),
        "pct_mulheres_senior": r(100 * emp[emp[C_NIVEL] == "Sênior"]["mulher"].mean()),
        "pct_mulheres_junior": r(100 * emp[emp[C_NIVEL] == "Júnior"]["mulher"].mean()),
        "pct_mulheres_diretoria": r(100 * emp[emp[C_CARGO_G] == "Diretor/VP"]["mulher"].mean()),
        "pct_mulheres_gestao": r(100 * emp[emp[C_GESTOR] == True]["mulher"].mean()),
        "sal_exterior": r(w[w[C_SIT] == "Vivo no Brasil e trabalho remoto para empresa de fora do Brasil"]["sal"].mean(), 0),
        "sal_clt": r(w[w[C_SIT] == "Empregado (CLT)"]["sal"].mean(), 0),
        "sal_presencial": r(w[w[C_MODELO] == "Modelo 100% presencial"]["sal"].mean(), 0),
        "sal_remoto": r(w[w[C_MODELO] == "Modelo 100% remoto"]["sal"].mean(), 0),
        "pct_insatisfeito_salario": r(100 * pd.to_numeric(df[col("2.l.1_")], errors="coerce").mean()),
        "pct_criterio_salario": r(100 * pd.to_numeric(df[col("2.o.1_")], errors="coerce").mean()),
        "pct_criterio_remoto": r(100 * pd.to_numeric(df[col("2.o.4_")], errors="coerce").mean()),
    },
    "perfil": {
        "idade": counts(df[C_IDADE_F], order=idade_order),
        "genero": counts(df[C_GEN]),
        "raca": counts(df[C_RACA]),
        "regiao": counts(df[C_REG]),
        "uf": counts(df[C_UF], top=15),
        "ensino": rename_items(counts(df[C_ENS], order=ENS_ORDER), ENS_SHORT),
        "formacao": rename_items(counts(df[C_FORM]), FORM_SHORT),
        "situacao": rename_items(counts(df[C_SIT]), SIT_ALL_SHORT),
        "atuacao": counts(df[C_ATUA]),
        "cargo": rename_items(counts(df[C_CARGO], top=12), CARGO_SHORT),
        "nivel": counts(df[C_NIVEL], order=NIVEL_ORDER),
        "setor": rename_items(counts(df[C_SETOR], top=14), SETOR_SHORT),
        "tamanho": rename_items(counts(df[C_TAM], order=TAM_ORDER), TAM_SHORT),
        "experiencia": rename_items(counts(df[C_EXP], order=EXP_ORDER), EXP_SHORT),
    },
    "salario": {
        "faixas_order": [SAL_SHORT[s] for s in SAL_ORDER],
        "distribuicao": [{"label": SAL_SHORT[s], "n": int((w[C_SAL] == s).sum()), "pct": r(100 * (w[C_SAL] == s).mean())} for s in SAL_ORDER],
        "distribuicao_por_nivel": {nv: [r(100 * (w[(w[C_NIVEL] == nv)][C_SAL] == s).mean()) for s in SAL_ORDER] for nv in NIVEL_ORDER},
        "por_cargo": sal_by(C_CARGO, short=CARGO_SHORT, min_n=40),
        "por_nivel": sal_by(C_NIVEL, order=NIVEL_ORDER),
        "por_cargo_gestao": sal_by(C_CARGO_G, order=CARGO_G_ORDER, short=CARGO_G_SHORT),
        "por_experiencia": sal_by(C_EXP, order=EXP_ORDER, short=EXP_SHORT),
        "por_situacao": sal_by(C_SIT, short=SIT_SHORT),
        "por_modelo": sal_by(C_MODELO, order=MODELO_ORDER, short=MODELO_SHORT),
        "por_regiao": sal_by(C_REG, order=["Sudeste", "Sul", "Centro-oeste", "Nordeste", "Norte"]),
        "por_uf": sal_by(C_UF, min_n=40),
        "por_ensino": sal_by(C_ENS, order=ENS_ORDER, short=ENS_SHORT),
        "por_tamanho": sal_by(C_TAM, order=TAM_ORDER, short=TAM_SHORT),
        "por_setor": sal_by(C_SETOR, min_n=70),
        "por_cloud": sal_by(col("4.i_"), min_n=100),
        "por_linguagem": sal_by(C_LMAIS, min_n=50),
        "por_cargo_nivel": [
            {"cargo": CARGO_SHORT.get(c, c), **{nv: {"media": r(g["mean"], 0), "n": int(g["count"])}
                                                 for nv, g in w[w[C_CARGO] == c].groupby(C_NIVEL)["sal"].agg(["mean", "count"]).iterrows() if g["count"] >= 20}}
            for c in ["Analista de BI/BI Analyst", "Analista de Dados/Data Analyst", "Analytics Engineer", "Engenheiro de Dados/Data Engineer/Data Architect", "Cientista de Dados/Data Scientist", "Engenheiro de Machine Learning/ML Engineer/AI Engineer"]
        ],
    },
    "diversidade": {
        "mulheres_por_estagio": share_women("estagio", car, order=ESTAGIO_ORDER, short=ESTAGIO_SHORT),
        "mulheres_por_cargo": share_women(C_CARGO, emp, short=CARGO_SHORT, min_n=40),
        "mulheres_por_atuacao": share_women(C_ATUA, df, min_n=40),
        "raca_por_estagio": share_race("estagio", car, order=ESTAGIO_ORDER, short=ESTAGIO_SHORT),
        "gap_genero_por_nivel": gap_by(C_NIVEL, order=NIVEL_ORDER),
        "gap_genero_por_cargo": gap_by(C_CARGO, short=CARGO_SHORT, min_n=25),
        "gap_genero_por_experiencia": gap_by(C_EXP, order=EXP_ORDER, short=EXP_SHORT),
        "gap_raca_por_nivel": gap_raca_by(C_NIVEL, order=NIVEL_ORDER),
        "gap_raca_por_experiencia": gap_raca_by(C_EXP, order=EXP_ORDER, short=EXP_SHORT, min_n=20),
        "prejuizo_percebido": prej_by_group,
        "aspectos_prejudicados": flags_short("1.f.", n=70),
        "mulheres_total": r(100 * df["mulher"].mean()),
        "pretos_pardos_total": r(100 * df[C_RACA].isin(["Preta", "Parda"]).mean()),
    },
    "remoto": {
        "atual": rename_items(counts(emp[C_MODELO], order=MODELO_ORDER), MODELO_SHORT),
        "ideal": rename_items(counts(emp[C_IDEAL], order=MODELO_ORDER), MODELO_SHORT),
        "atitude": rename_items(counts(emp[C_ATIT]), ATIT_SHORT),
        "atitude_por_modelo": {"columns": [ATIT_SHORT[c] for c in ATIT_SHORT], "rows": [
            {"label": MODELO_SHORT[k], "n": int(len(g)), "values": {ATIT_SHORT[a]: r(100 * g[C_ATIT].eq(a).mean()) for a in ATIT_SHORT}}
            for k, g in emp.groupby(C_MODELO) if k in MODELO_SHORT]},
        "satisfacao_por_modelo": [{"label": MODELO_SHORT[k], "n": int(len(g)), "pct": r(100 * g[C_SAT].astype(bool).mean())} for k, g in emp.groupby(C_MODELO) if k in MODELO_SHORT],
        "busca_por_modelo": [{"label": MODELO_SHORT[k], "n": int(len(g)), "pct": r(100 * g[C_PLANOS].str.startswith("Estou em busca").mean())} for k, g in emp.groupby(C_MODELO) if k in MODELO_SHORT],
        "ideal_por_atual": {"columns": list(MODELO_SHORT.values()), "rows": [
            {"label": MODELO_SHORT[k], "n": int(len(g)), "values": {MODELO_SHORT[m]: r(100 * g[C_IDEAL].eq(m).mean()) for m in MODELO_ORDER}}
            for k, g in emp.groupby(C_MODELO) if k in MODELO_SHORT]},
        "modelo_por_regiao": pct_table(emp[C_REG], emp[C_MODELO].map(MODELO_SHORT), col_order=list(MODELO_SHORT.values())),
        "modelo_por_tamanho": pct_table(emp[C_TAM].map(TAM_SHORT), emp[C_MODELO].map(MODELO_SHORT), col_order=list(MODELO_SHORT.values())),
        "modelo_por_nivel": pct_table(emp[C_NIVEL], emp[C_MODELO].map(MODELO_SHORT), col_order=list(MODELO_SHORT.values())),
        "insatisfacao_flex_por_modelo": [{"label": MODELO_SHORT[k], "n": int(g[col("2.l.4_")].notna().sum()), "pct": r(100 * pd.to_numeric(g[col("2.l.4_")], errors="coerce").mean())} for k, g in emp.groupby(C_MODELO) if k in MODELO_SHORT],
    },
    "mercado": {
        "satisfeito": r(100 * emp[C_SAT].astype(bool).mean()),
        "planos": rename_items(counts(emp[C_PLANOS]), PLANOS_SHORT),
        "entrevistas": rename_items(counts(emp[C_ENTREV]), ENTREV_SHORT),
        "layoff": rename_items(counts(emp[C_LAYOFF]), LAYOFF_SHORT),
        "layoff_por_setor": lay_setor_items,
        "satisfacao_por_layoff": sat_layoff,
        "busca_por_layoff": busca_layoff,
        "motivos_insatisfacao": flags_short("2.l.", rename=MOT_RENAME),
        "criterios_escolha": flags_short("2.o."),
        "planos_por_satisfacao": {"columns": list(PLANOS_SHORT.values()), "rows": [
            {"label": "Satisfeitos" if k else "Insatisfeitos", "n": int(len(g)), "values": {PLANOS_SHORT[p]: r(100 * g[C_PLANOS].eq(p).mean()) for p in PLANOS_SHORT}}
            for k, g in emp.groupby(emp[C_SAT].astype(bool))]},
        "satisfacao_por_nivel": [{"label": k, "n": int(len(g)), "pct": r(100 * g[C_SAT].astype(bool).mean())} for k, g in emp.groupby(C_NIVEL)],
        "satisfacao_por_cargo": sorted([{"label": CARGO_SHORT.get(k, k), "n": int(len(g)), "pct": r(100 * g[C_SAT].astype(bool).mean())} for k, g in emp.groupby(C_CARGO) if len(g) >= 70], key=lambda x: -x["pct"]),
        "satisfacao_por_salario": [{"label": SAL_SHORT[s], "n": int((emp[C_SAL] == s).sum()), "pct": r(100 * emp[emp[C_SAL] == s][C_SAT].astype(bool).mean())} for s in SAL_ORDER if (emp[C_SAL] == s).sum() >= 50],
        "busca_por_salario": [{"label": SAL_SHORT[s], "n": int((emp[C_SAL] == s).sum()), "pct": r(100 * emp[emp[C_SAL] == s][C_PLANOS].str.startswith("Estou em busca").mean())} for s in SAL_ORDER if (emp[C_SAL] == s).sum() >= 50],
        "busca_exterior_por_nivel": [{"label": k, "n": int(len(g)), "pct": r(100 * g[C_PLANOS].str.contains("fora do Brasil").mean())} for k, g in emp.groupby(C_NIVEL)],
        "buscando": {
            "objetivo": counts(df[col("5.a_")], top=8),
            "oportunidade": counts(df[col("5.b_")], top=8),
            "tempo": counts(df[col("5.c_")], order=["0 - 6 meses", "7 meses - 1 ano", "1 ano - 2 anos", "acima de 2 anos"]),
            "experiencia": counts(df[col("5.d_")], top=8),
        },
    },
    "ia": {
        "uso": flags_short("4.m.", rename=IA_USO_SHORT),
        "uso_por_atuacao": ia_by(C_ATUA, order=["Ciência de Dados", "Engenharia de Dados", "Análise de Dados", "Gestor", "Outra atuação"]),
        "uso_por_nivel": ia_by(C_NIVEL, order=NIVEL_ORDER),
        "uso_por_tamanho": ia_by(C_TAM, order=TAM_ORDER, short=TAM_SHORT),
        "uso_por_setor": ia_by(C_SETOR, short=SETOR_SHORT, min_n=90),
        "uso_por_cargo": ia_by(C_CARGO, short=CARGO_SHORT, min_n=70),
        "empresa": flags_short("4.l.", rename=IA_EMP_SHORT),
        "prioridade_gestores": rename_items(counts(df[col("3.e_")], order=PRIO_ORDER), PRIO_SHORT),
        "prioridade_por_tamanho": pct_table(ges[C_TAM].map(TAM_SHORT), ges[col("3.e_")].map(PRIO_SHORT), col_order=list(PRIO_SHORT.values()), min_n=40),
        "prioridade_por_setor": pct_table(ges[C_SETOR].map(SETOR_SHORT), ges[col("3.e_")].map(PRIO_SHORT), col_order=list(PRIO_SHORT.values()), min_n=40),
        "barreiras": flags_short("3.g.", n=70),
        "uso_empresa_gestores": flags_short("3.f.", rename=IA_EMP_SHORT),
        "salario_por_perfil_nivel": ia_sal_nivel,
        "llm_ds": r(100 * pd.to_numeric(ds[col("8.b.14_")], errors="coerce").mean()),
        "llm_ds_rotina": r(100 * pd.to_numeric(ds[col("8.a.12_")], errors="coerce").mean()),
    },
    "stack": {
        "linguagens": flags_short("4.d.", rename=LANG_RENAME),
        "linguagem_mais_usada": counts(df[C_LMAIS], top=6),
        "linguagem_preferida": counts(df[C_LPREF], top=6),
        "pref_por_mais_usada": lang_pref_mais,
        "linguagem_por_atuacao": {"columns": ["SQL", "Python", "R"], "rows": [
            {"label": k, "n": int(g[C_LMAIS].notna().sum()), "values": {l: r(100 * g[C_LMAIS].eq(l).sum() / g[C_LMAIS].notna().sum()) for l in ["SQL", "Python", "R"]}}
            for k, g in df.groupby(C_ATUA) if g[C_LMAIS].notna().sum() >= 100]},
        "cloud": flags_short("4.h.", rename=CLOUD_RENAME),
        "cloud_preferida": rename_items(counts(df[col("4.i_")].where(df[col("4.i_")].isin(["Amazon Web Services (AWS)", "Google Cloud (GCP)", "Azure (Microsoft)", "Não sei opinar / Não tenho preferência"]))), {**CLOUD_RENAME, "Não sei opinar / Não tenho preferência": "Sem preferência"}),
        "cloud_por_setor": pct_table(cl[C_SETOR].map(SETOR_SHORT), None if False else cl[C_SETOR].map(SETOR_SHORT), min_n=99999) if False else None,
        "multi_cloud_pct": r(100 * multi / len(cl)),
        "so_onprem_pct": r(100 * only_onprem / len(cl)),
        "cloud_answered": int(len(cl)),
        "cloud_por_setor_flags": [
            {"label": SETOR_SHORT.get(k, k), "n": int(len(g)), **{CLOUD_RENAME[nm]: r(100 * g[col(pfx)].astype(float).mean()) for pfx, nm in [("4.h.1_", "Amazon Web Services (AWS)"), ("4.h.2_", "Google Cloud (GCP)"), ("4.h.3_", "Azure (Microsoft)"), ("4.h.6_", "Servidores On Premise/Não utilizamos Cloud")]}}
            for k, g in cl.groupby(C_SETOR) if len(g) >= 90 and k != "Outra Opção"],
        "bancos": flags_short("4.g.", top=15),
        "bi": flags_short("4.j.", rename=BI_RENAME, top=12),
        "bi_preferida": counts(df[col("4.k_")].where(~df[col("4.k_")].isin(["Não tenho preferência / Não sei opinar"])), top=7),
        "etl_de": flags_short("6.b.", base=de, rename=ETL_RENAME, top=12),
        "etl_da": flags_short("7.b.", base=da, rename=ETL_RENAME, top=10),
        "lake_tech": counts(df[col("6.d_")]),
        "dw_tech": counts(df[col("6.f_")]),
        "possui_lake": r(100 * df[col("6.c_")].astype(float).mean()),
        "possui_dw": r(100 * df[col("6.e_")].astype(float).mean()),
        "dq_tools": counts(df[col("6.g_")], top=10),
        "dq_answered": int(df[col("6.g_")].notna().sum()),
        "de_rotina": flags_short("6.a.", base=de, n=80),
        "de_maior_tempo": flags_short("6.h.", base=de, n=80),
        "da_rotina": flags_short("7.a.", base=da, n=80),
        "da_maior_tempo": flags_short("7.d.", base=da, n=80),
        "ds_rotina": flags_short("8.a.", base=ds, n=80),
        "ds_tecnicas": flags_short("8.b.", base=ds, n=70),
        "ds_tech": flags_short("8.c.", base=ds, n=70),
        "ds_maior_tempo": flags_short("8.d.", base=ds, n=80),
        "fontes": flags_short("4.b."),
    },
    "gestores": {
        "n": int(len(ges)),
        "tamanho_time": counts(df[col("3.a_")], order=["Ainda não temos pessoas atuando com dados na empresa", "1 - 3", "4 - 10", "11 - 20", "21 - 50", "51 - 100", "101 - 300", "Acima de 300 pessoas"]),
        "cargos_time": flags_short("3.b."),
        "responsabilidades": flags_short("3.c.", n=70),
        "desafios": flags_short("3.d.", n=70),
        "cargo": rename_items(counts(df[C_CARGO_G], order=CARGO_G_ORDER), CARGO_G_SHORT),
    },
}

# limpeza: remover None de stack
data["stack"].pop("cloud_por_setor", None)


def clean(o):
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [clean(v) for v in o]
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (np.floating,)):
        return None if np.isnan(o) else float(o)
    if isinstance(o, (np.bool_,)):
        return bool(o)
    return o


OUT.parent.mkdir(parents=True, exist_ok=True)
payload = json.dumps(clean(data), ensure_ascii=False, separators=(",", ":"))
OUT.write_text("window.SOD = " + payload + ";\n", encoding="utf-8")
print(f"ok -> {OUT} ({len(payload)/1024:.0f} KB)")
