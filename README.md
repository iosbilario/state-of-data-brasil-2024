# State of Data Brasil 2024/25 — o que os dados dizem

Análise independente das **5.217 respostas** da pesquisa [State of Data Brazil 2024/2025](https://www.kaggle.com/datasets/datahackers/state-of-data-brazil-20242025), da Data Hackers, publicada no Kaggle.

**Site:** https://iosbilario.github.io/state-of-data-brasil-2024/

## As sete histórias

1. **Salário: a fronteira paga mais que o cargo.** Quem mora no Brasil e trabalha remoto para empresa estrangeira ganha em média R$ 26 mil, mais que o dobro do CLT (R$ 11,5 mil). O 100% presencial é o modelo que menos paga.
2. **Remoto: a volta ao escritório é uma guerra perdida.** 98% querem remoto ou híbrido e 75% procurariam outra vaga se obrigados a voltar ao presencial (91% entre os já remotos).
3. **Gênero e raça: o funil estreita a cada degrau.** Mulheres são 28% dos juniores, 21% dos seniores e 10% da diretoria. O gap salarial é zero no júnior e −17% no sênior. Pessoas pretas vão de 8% dos juniores a 2% dos diretores.
4. **Mercado: satisfeitos, mas de olho na porta.** 69% satisfeitos, 34% buscando ativamente, 9% só no exterior. Salário é o motivo nº 1 de insatisfação e o critério nº 1 de escolha; 29% viram layoffs na empresa.
5. **IA generativa: todo mundo usa, quase ninguém paga.** 93,5% usam; 54% só versões gratuitas; a empresa paga para 19%. Cientistas de dados lideram a adoção paga.
6. **Stack: SQL e Python são universais, a cloud depende do setor.** Varejo é GCP (68%), bancos são AWS (64%), setor público é on-premise (39%). Power BI domina o BI.
7. **Gestores: o desafio é expectativa, não tecnologia.** Gerenciar expectativa das áreas e dividir tempo entre técnica e gestão lideram; volume de dados e ML em produção ficam no fim.

## Reproduzir

```bash
pip install -r requirements.txt
python analysis/build_data.py            # baixa via kagglehub e gera docs/data.js
# ou, com o CSV já baixado:
python analysis/build_data.py caminho/para/df_survey_2024.csv
```

Depois abra `docs/index.html` (ou sirva a pasta `docs/`). O site é estático: HTML, CSS e JS puro com Chart.js via CDN; todos os agregados estão em `docs/data.js`.

## Método

- **Salários** são faixas na pesquisa. Médias e percentis usam o ponto médio de cada faixa (a última, "acima de R$ 40 mil", vira R$ 45 mil). Análises salariais consideram apenas quem está trabalhando (CLT, PJ, servidor público, empresa estrangeira, freelancer): 4.650 pessoas.
- **Bases.** Em perguntas de múltipla escolha, o denominador é quem respondeu ao bloco; cada gráfico mostra o n. Grupos com menos de 30 respostas foram omitidos (25 nas comparações de gênero e raça por nível).
- **Correlação ≠ causa.** Diferenças entre grupos podem refletir senioridade, setor ou tamanho de empresa. Onde foi possível, a comparação é feita dentro do mesmo nível.
- **Amostra** auto-selecionada (comunidade Data Hackers), com viés para profissionais já inseridos e conectados.

## Estrutura

```
analysis/build_data.py   # pandas: lê o CSV e gera todos os agregados
docs/index.html          # narrativa + grade de gráficos
docs/app.js              # especificações dos gráficos (Chart.js) e tabelas
docs/style.css           # tema claro/escuro
docs/data.js             # agregados gerados (window.SOD)
```

## Créditos

Dados © [Data Hackers](https://www.datahackers.news/) (State of Data Brazil 2024/2025). Análise e site por [iosbilario](https://github.com/iosbilario).
