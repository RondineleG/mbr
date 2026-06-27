/* ═══════════════════════════════════════════════════════════════
   NARRATE-BUILD — monta UM vídeo com as 3 personas lado a lado,
   narração em áudio (espeak-ng / TTS pt-br) e legendas .srt, tudo
   sincronizado pela timeline real (docs/e2e/videos/timeline.json).

   Saída:
     docs/e2e/videos/apresentacao-3personas.mp4
     docs/e2e/videos/narracao.srt
   Pré-requisitos: ffmpeg/ffprobe no PATH e espeak-ng extraído em TTS_PREFIX.
   ═══════════════════════════════════════════════════════════════ */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const VDIR = "docs/e2e/videos";
const WORK = "/tmp/claude-1000/-mnt-windows-Dev-MVP/5759e16c-9c9e-4ee4-b7a4-395d26a1df0c/scratchpad";
// Piper TTS (rede neural, voz pt-BR natural) — binário + modelo de voz.
const PIPER_DIR = `${WORK}/piper/piper`;            // libs (onnxruntime, espeak-ng)
const PIPER_BIN = `${PIPER_DIR}/piper`;
const PIPER_VOICE = `${WORK}/piper/voz.onnx`;       // pt_BR-faber-medium
const PIPER_ESPEAK_DATA = `${PIPER_DIR}/espeak-ng-data`;
const CUEDIR = `${WORK}/tts/cues`;
const FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

// Compensa o atraso entre o início real da gravação e o T0 da timeline (~2s),
// para a legenda/voz cair junto do evento na tela.
const SHIFT = 2.0;
const LENGTH_SCALE = 1.0; // ritmo do Piper (>1 mais lento, <1 mais rápido)
const END_PAD = 0.4;      // sobra após a fala terminar
const DUR = 318;          // duração final (corta o ocioso do fim)

const sh = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`${cmd} falhou: ${r.stderr || r.stdout}`);
  return r.stdout;
};
const probeDur = (f) =>
  parseFloat(sh("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).trim());

// ── Timeline: label → segundos ──
const tl = JSON.parse(fs.readFileSync(`${VDIR}/timeline.json`, "utf8"));
const at = (frag) => {
  const s = tl.steps.find((x) => x.label.includes(frag));
  if (!s) throw new Error(`passo não encontrado: ${frag}`);
  return s.t / 1000;
};

// ── Roteiro: cada cue ancorado num passo (ou segundo fixo p/ preencher vãos) ──
const CUES = [
  { at: at("login no app"),               text: "Bem-vindo ao MrBur. Vamos acompanhar um pedido real, do toque ao entregue." },
  { at: at("abre o cardápio"),            text: "O cliente entra e vai direto ao Monte Seu Lanche. Em vez de pedir um lanche pronto, ele cria o seu." },
  { sec: 35,                               text: "Escolhe o pão, a carne e os ingredientes, montando o lanche do seu jeito." },
  { at: at("adiciona adicional"),         text: "Adiciona um toque especial, o bacon artesanal. Agora é uma criação dele, e vai pra sacola." },
  { at: at("checkout"),                   text: "No checkout, informa o cartão e confirma o pagamento. Em segundos, o pedido está feito." },
  { at: at("Admin · login"),              text: "Do outro lado, na cozinha, o painel de Comando recebe o pedido na hora." },
  { at: at("vai para Pedidos"),           text: "A plataforma encontra o pedido na lista, em tempo real." },
  { at: at("Aprovado"),                   text: "Analisa e aprova o pedido." },
  { at: at("atribui o motoboy"),          text: "Escolhe quem vai entregar e atribui o motoboy." },
  { at: at("Em produção"),                text: "Manda para a produção." },
  { at: at("Enviado"),                    text: "E marca como enviado: o lanche saiu para a rua." },
  { at: at("Motoboy · login"),            text: "O entregador abre a Central de Entregas e o pedido já aparece na rota dele." },
  { at: at("liga o rastreio"),            text: "Ele ativa o rastreio, e o mapa desenha o caminho da loja até o cliente." },
  { at: at("escreve ao cliente"),         text: "Pelo chat, avisa o cliente que já está a caminho." },
  { at: at("vê o pedido a caminho"),      text: "No celular do cliente, o pedido aparece a caminho, com o entregador se movendo no mapa, ao vivo." },
  { sec: 172,                              text: "Tudo acontece em tempo real, sem precisar recarregar a tela." },
  { at: at("recebe a mensagem do motoboy"), text: "A mensagem do entregador chega na hora, e o cliente responde sem sair do app." },
  { at: at("abre 'Falar com a loja'"),    text: "Mas não é só com o entregador. Com uma dúvida, o cliente fala direto com a loja." },
  { at: at("abre o chat com o cliente"),  text: "E o atendimento da plataforma responde, da cozinha." },
  { at: at("abre 'Suporte'"),             text: "Travou no portão do condomínio? O entregador aciona o suporte." },
  { at: at("responde ao motoboy"),        text: "A plataforma resolve na hora. São três conversas independentes: cliente, entregador e loja." },
  { at: at("marca como Entregue"),        text: "Endereço alcançado: o entregador marca o pedido como entregue." },
  { at: at("vê o pedido como Entregue"),  text: "No app do cliente, o status muda sozinho, em tempo real." },
  { sec: 282,                              text: "Cada etapa ficou registrada, do recebido ao entregue." },
  { at: at("extrato de méritos"),         text: "E os méritos caem na conta: pela entrega, pela criação e pelas missões. Do primeiro toque ao último gole. MrBur." },
];

// Tempo de início (com SHIFT), ordenado.
const cues = CUES
  .map((c) => ({ ...c, start: (c.sec != null ? c.sec : c.at) + SHIFT }))
  .sort((a, b) => a.start - b.start);

fs.mkdirSync(CUEDIR, { recursive: true });

// ── 1) Gera o WAV de cada cue (Piper TTS, voz natural) e mede a duração ──
console.log("🎙️  gerando narração (Piper TTS · pt_BR-faber)…");
cues.forEach((c, i) => {
  c.wav = path.join(CUEDIR, `cue_${String(i).padStart(2, "0")}.wav`);
  const r = spawnSync(PIPER_BIN,
    ["--model", PIPER_VOICE, "--espeak_data", PIPER_ESPEAK_DATA,
     "--length_scale", String(LENGTH_SCALE), "--output_file", c.wav],
    { input: c.text, env: { ...process.env, LD_LIBRARY_PATH: PIPER_DIR }, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`piper falhou: ${r.stderr}`);
  c.dur = probeDur(c.wav);
});

// ── 2) Legendas .srt (fim = antes do próximo cue, limitado à fala + sobra) ──
const fmt = (s) => {
  const ms = Math.round((s % 1) * 1000), t = Math.floor(s);
  const hh = String(Math.floor(t / 3600)).padStart(2, "0");
  const mm = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
  const ss = String(t % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss},${String(ms).padStart(3, "0")}`;
};
const srt = cues.map((c, i) => {
  const next = cues[i + 1] ? cues[i + 1].start - 0.1 : DUR;
  const end = Math.min(next, c.start + c.dur + END_PAD);
  return `${i + 1}\n${fmt(c.start)} --> ${fmt(Math.max(end, c.start + 1))}\n${c.text}\n`;
}).join("\n");
fs.writeFileSync(`${VDIR}/narracao.srt`, srt);
console.log(`📝 ${VDIR}/narracao.srt (${cues.length} legendas)`);

// ── 3) Faixa de narração: cada WAV posicionado no seu tempo (adelay) + amix ──
console.log("🔊 montando a faixa de narração…");
const narr = `${WORK}/tts/narration.wav`;
{
  const inputs = cues.flatMap((c) => ["-i", c.wav]);
  const delays = cues.map((c, i) => `[${i}:a]adelay=${Math.round(c.start * 1000)}|${Math.round(c.start * 1000)}[a${i}]`);
  const mix = `${cues.map((_, i) => `[a${i}]`).join("")}amix=inputs=${cues.length}:normalize=0[a]`;
  sh("ffmpeg", ["-y", ...inputs, "-filter_complex", `${delays.join(";")};${mix}`, "-map", "[a]", "-ar", "44100", narr]);
}

// ── 4) Composição final: 3 vídeos lado a lado + rótulos + legendas + narração ──
console.log("🎬 compondo o vídeo final…");
const out = `${VDIR}/apresentacao-3personas.mp4`;
const label = (txt) =>
  `drawtext=fontfile=${FONT}:text='${txt}':x=14:y=14:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=10`;
const style = "FontName=DejaVu Sans,Fontsize=15,PrimaryColour=&H00FFFFFF&,OutlineColour=&H00000000&,BorderStyle=1,Outline=2,Shadow=1,Alignment=2,MarginV=16";
const fc = [
  `[0:v]scale=-2:600,${label("CLIENTE")}[v0]`,
  `[1:v]scale=-2:600,${label("PLATAFORMA · ADMIN")}[v1]`,
  `[2:v]scale=-2:600,${label("MOTOBOY")}[v2]`,
  `[v0][v1][v2]hstack=inputs=3[row]`,
  `[row]subtitles=${VDIR}/narracao.srt:force_style='${style}'[v]`,
].join(";");
sh("ffmpeg", [
  "-y",
  "-i", `${VDIR}/cliente.webm`, "-i", `${VDIR}/admin.webm`, "-i", `${VDIR}/motoboy.webm`, "-i", narr,
  "-filter_complex", fc,
  "-map", "[v]", "-map", "3:a",
  "-t", String(DUR),
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p",
  "-c:a", "aac", "-b:a", "128k",
  out,
]);

const mb = (fs.statSync(out).size / 1048576).toFixed(1);
console.log(`\n✅ ${out} (${mb} MB, ${DUR}s) · pedido ${tl.pedido}`);
