/*********************************************************
 MQTT CONFIG
*********************************************************/
const client = mqtt.connect(
  "wss://d8b9ac96f2374248a0784545f5e59901.s1.eu.hivemq.cloud:8884/mqtt",
  {
    username: "Penyiraman_Otomatis",
    password: "Pro111816",
    reconnectPeriod: 2000,
    clean: true
  }
);

/*********************************************************
 ELEMENT
*********************************************************/
const mqttStatus = document.getElementById("mqttStatus");
const espStatus  = document.getElementById("espStatus");
const lastUpdate = document.getElementById("lastUpdate");

const soilEl       = document.getElementById("soil");
const battVoltEl   = document.getElementById("battVolt");
const battCurrEl   = document.getElementById("battCurr");
const battPowerEl  = document.getElementById("battPower");

const panelVoltEl  = document.getElementById("panelVolt");
const panelCurrEl  = document.getElementById("panelCurr");
const panelPowerEl = document.getElementById("panelPower");

const modeEl  = document.getElementById("mode");
const pompaEl = document.getElementById("pompa");

/*********************************************************
 HEARTBEAT SYSTEM
*********************************************************/
let lastHeartbeat = 0;
let everOnline = false;
const HEARTBEAT_TIMEOUT = 4000;
const pageStart = Date.now();

/*********************************************************
 CHART INIT (HANYA SEKALI)
*********************************************************/
const ctx = document.getElementById("soilChart").getContext("2d");

const soilChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [{
      label: "Kelembapan (%)",
      data: [],
      borderColor: "#2ecc71",
      backgroundColor: "rgba(46,204,113,0.25)",
      tension: 0.4,
      fill: true
    }]
  },
  options: {
    responsive: true,
    animation: false,
    scales: {
      y: {
        min: 0,
        max: 100,
        title: { display: true, text: "Kelembapan (%)" }
      },
      x: {
        title: { display: true, text: "Waktu (Jam:Menit:Detik)" }
      }
    }
  }
});

function addSoilData(val) {
  const time = new Date().toLocaleTimeString();
  soilChart.data.labels.push(time);
  soilChart.data.datasets[0].data.push(val);

  if (soilChart.data.labels.length > 20) {
    soilChart.data.labels.shift();
    soilChart.data.datasets[0].data.shift();
  }

  soilChart.update();
  lastUpdate.textContent = time;
}

/*********************************************************
 MQTT EVENTS
*********************************************************/
client.on("connect", () => {
  mqttStatus.textContent = "CONNECTED";
  mqttStatus.className = "ok";
  client.subscribe("irrigation/#");
});

client.on("offline", () => {
  mqttStatus.textContent = "DISCONNECTED";
  mqttStatus.className = "bad";
});

/*********************************************************
 MESSAGE HANDLER
*********************************************************/
client.on("message", (topic, message) => {
  const data = message.toString();

  if (topic === "irrigation/heartbeat") {
    lastHeartbeat = Date.now();
    everOnline = true;
    espStatus.textContent = "ONLINE";
    espStatus.className = "ok";
    return;
  }

  if (topic === "irrigation/soil") {
    soilEl.textContent = data;
    addSoilData(Number(data));
  }

  if (topic === "irrigation/battery/voltage") battVoltEl.textContent = data;
  if (topic === "irrigation/battery/current") battCurrEl.textContent = data;
  if (topic === "irrigation/battery/power")   battPowerEl.textContent = data;

  if (topic === "irrigation/panel/voltage") panelVoltEl.textContent = data;
  if (topic === "irrigation/panel/current") panelCurrEl.textContent = data;
  if (topic === "irrigation/panel/power")   panelPowerEl.textContent = data;

  if (topic === "irrigation/mode")
    modeEl.textContent = data === "1" ? "AUTO" : "MANUAL";

  if (topic === "irrigation/pump")
    pompaEl.textContent = data === "1" ? "ON" : "OFF";
});

/*********************************************************
 ONLINE CHECK
*********************************************************/
setInterval(() => {
  const now = Date.now();

  if (!everOnline && now - pageStart > 4000) {
    espStatus.textContent = "OFFLINE";
    espStatus.className = "bad";
  }

  if (everOnline && now - lastHeartbeat > HEARTBEAT_TIMEOUT) {
    espStatus.textContent = "OFFLINE";
    espStatus.className = "bad";
  }
}, 1000);

/*********************************************************
 CONTROL BUTTON
*********************************************************/
function toggleMode() {
  client.publish("irrigation/cmd/mode", "TOGGLE");
}

function setPump(state) {
  client.publish("irrigation/cmd/pump", state);
}
