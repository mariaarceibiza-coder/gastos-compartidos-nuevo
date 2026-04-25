const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const Anthropic = require("@anthropic-ai/sdk");

setGlobalOptions({ maxInstances: 5, region: "europe-west1" });

exports.getMensajeCoach = onRequest(
  { secrets: ["ANTHROPIC_API_KEY2"], cors: true, invoker: "public" },
  async (req, res) => {
    if (req.method !== "POST") { res.status(405).send("Method Not Allowed"); return; }
    const { ingresos, gastadoMes, gastadoSemana, topeSemana, diasRestantes,
      proyeccion, presupuestoVariables, metas, topCategoria, topCategoriaImporte, diaSemana } = req.body;
    const margenMes = presupuestoVariables - gastadoMes;
    const pctSemana = topeSemana > 0 ? Math.round((gastadoSemana / topeSemana) * 100) : 0;
    const esFinDeSemana = diaSemana >= 5;
    const metasTexto = Array.isArray(metas) && metas.length > 0
      ? metas.map(m => m.nombre + " (" + Math.round((m.aportado/m.objetivo)*100) + "%, faltan " + (m.objetivo - m.aportado).toFixed(0) + "eur)").join(", ")
      : "sin metas";
    const estado = proyeccion > presupuestoVariables ? "peligro" : proyeccion > presupuestoVariables * 0.9 ? "ajustado" : "bien";
    const prompt = "Eres el coach financiero de una pareja joven espanola con un hijo pequeno Bruno. Genera un mensaje corto max 3 frases 60 palabras para la pantalla de inicio. Datos: ingresos=" + ingresos + "EUR gastado=" + gastadoMes + "EUR margen=" + margenMes.toFixed(0) + "EUR dias=" + diasRestantes + " estado=" + estado + " semana=" + pctSemana + "% metas=" + metasTexto + " finde=" + esFinDeSemana + " mayor_gasto=" + topCategoria + " " + topCategoriaImporte + "EUR. Se directo cercano con humor usa vosotros menciona impacto concreto. Escribe en espanol con tildes y enies. Solo el mensaje sin comillas.";
    try {
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY2 });
      const response = await client.messages.create({ model: "claude-sonnet-4-6", max_tokens: 150, messages: [{ role: "user", content: prompt }] });
      res.status(200).json({ mensaje: response.content[0].text.trim() });
    } catch (error) {
      console.error("Error Anthropic:", error.message || error);
      res.status(500).json({ error: "Error generando mensaje", detalle: error.message });
    }
  }
);
