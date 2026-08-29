const TG_TOKEN   = "tg token";
const TG_CHAT_ID = "tg id";
const PANEL_URL  = "Lite web";
const PHOTO_URL  = "https://img.uppic.to/2026/08/27/lite-telegram-banner.png";
const SEND_BRAND_IMAGE = true;
const TIME_ZONE_OFFSET = 8;

const EVENT = {
  OFFLINE: "Offline",
  ONLINE: "Online",
  EXPIRE: "Expire",
  RENEW: "Renew",
  LOGIN: "Login",
  ALERT: "Alert",
  TRAFFIC: "Traffic",
  DAILY_REPORT: "DReport",
  WEEKLY_REPORT: "WReport",
  MONTHLY_REPORT: "MReport",
  PING_LOSS: "延迟监测告警",
  RETURN_ROUTE: "回程线路告警",
  TEST: "Test",
};

function cleanBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function firstClient(event) {
  const clients = asArray(event && event.clients);
  return clients.length === 1 ? clients[0] : null;
}

function clientName(client) {
  return String((client && (client.name || client.uuid)) || "未知服务器").trim();
}

function eventRecovered(event) {
  const message = String((event && event.message) || "");
  const emoji = String((event && event.emoji) || "");
  return /恢复|recovered|resolved/i.test(message) || /✅|🟢/.test(emoji);
}

function normalizeEventName(value) {
  const name = String(value || "Unknown");
  if (["CPU", "MEM", "RAM", "Disk", "Load"].includes(name)) return EVENT.ALERT;
  return name;
}

function formatTime(value) {
  const source = value ? new Date(value) : new Date();
  const date = Number.isNaN(source.getTime()) ? new Date() : source;
  const local = new Date(date.getTime() + TIME_ZONE_OFFSET * 60 * 60 * 1000);
  const pad = (number) => String(number).padStart(2, "0");
  return [
    local.getUTCFullYear(),
    "-",
    pad(local.getUTCMonth() + 1),
    "-",
    pad(local.getUTCDate()),
    " ",
    pad(local.getUTCHours()),
    ":",
    pad(local.getUTCMinutes()),
    ":",
    pad(local.getUTCSeconds()),
  ].join("");
}

function formatDisplayTime(value) {
  const formatted = formatTime(value);
  const match = formatted.match(/^(\d{4})-(\d{2})-(\d{2})\s+(.+)$/);
  if (!match) return formatted;
  return match[1] + "-" + Number(match[2]) + "-" + Number(match[3]) + " " + match[4];
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let amount = bytes;
  let index = 0;
  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index += 1;
  }
  const digits = amount >= 100 || index === 0 ? 0 : amount >= 10 ? 1 : 2;
  return amount.toFixed(digits).replace(/\.0+$/, "") + " " + units[index];
}

function joinSpecs(client) {
  if (!client) return "";
  const values = [];
  if (Number(client.cpu_cores) > 0) values.push(client.cpu_cores + " vCPU");
  const memory = formatBytes(client.mem_total);
  const disk = formatBytes(client.disk_total);
  if (memory) values.push(memory + " 内存");
  if (disk) values.push(disk + " 磁盘");
  return values.join(" · ");
}

function panelUrl(path) {
  const base = cleanBaseUrl(PANEL_URL);
  if (!path) return base;
  return base + (String(path).startsWith("/") ? path : "/" + path);
}

function resourceEventTitle(message, recovered) {
  const label = String(message || "")
    .replace(/\s*已恢复\s*$/i, "")
    .replace(/\s*(告警|异常)\s*$/i, "")
    .trim() || "资源指标";
  return label + (recovered ? " 已恢复" : " 告警");
}

function trafficProgress(percent) {
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  const filled = Math.round(value / 10);
  return "■".repeat(filled) + "□".repeat(10 - filled);
}

function resolveProfile(event) {
  const name = normalizeEventName(event && event.event);
  const recovered = eventRecovered(event);
  const profiles = {
    [EVENT.OFFLINE]: {
      icon: "🔴",
      title: "服务器离线",
      note: "心跳连接已中断，请检查网络或 Agent。",
    },
    [EVENT.ONLINE]: {
      icon: "🟢",
      title: "服务器上线",
      note: "心跳连接已恢复。",
    },
    [EVENT.ALERT]: {
      icon: recovered ? "✅" : "⚠️",
      title: resourceEventTitle(event && event.message, recovered),
    },
    [EVENT.TRAFFIC]: {
      icon: "📊",
      title: "流量阈值告警",
    },
    [EVENT.RENEW]: {
      icon: "✅",
      title: "续期完成",
    },
    [EVENT.EXPIRE]: {
      icon: "⏳",
      title: "服务器即将到期",
    },
    [EVENT.LOGIN]: {
      icon: "🔐",
      title: "后台登录",
      note: "请确认本次登录是否为本人操作。",
    },
    [EVENT.DAILY_REPORT]: {
      icon: "📈",
      title: "流量日报",
    },
    [EVENT.WEEKLY_REPORT]: {
      icon: "📈",
      title: "流量周报",
    },
    [EVENT.MONTHLY_REPORT]: {
      icon: "📈",
      title: "流量月报",
    },
    [EVENT.PING_LOSS]: {
      icon: recovered ? "✅" : "📡",
      title: recovered ? "延迟监测恢复" : "延迟监测异常",
    },
    [EVENT.RETURN_ROUTE]: {
      icon: recovered ? "✅" : "🛰️",
      title: recovered ? "回程线路恢复" : "回程线路切换",
    },
    [EVENT.TEST]: {
      icon: "✅",
      title: "Telegram 通道正常",
      note: "测试消息已成功送达。",
    },
  };

  return {
    name,
    recovered,
    ...(profiles[name] || {
      icon: "🔔",
      title: "系统通知",
    }),
  };
}

function resolveTarget(event, profile) {
  const client = firstClient(event);
  const uuid = client && client.uuid ? encodeURIComponent(String(client.uuid)) : "";
  const manyClients = asArray(event && event.clients).length > 1;

  if (profile.name === EVENT.PING_LOSS) {
    const query = uuid
      ? "?node=" + uuid + (profile.recovered ? "" : "&state=active")
      : profile.recovered ? "" : "?state=active";
    return {
      label: profile.recovered ? "查看延迟监测" : "查看延迟告警",
      path: "/admin/notification/ping-loss" + query,
    };
  }

  if (profile.name === EVENT.RETURN_ROUTE) {
    return {
      label: "查看回程线路",
      path: "/admin/return-route",
    };
  }

  if (profile.name === EVENT.TRAFFIC) {
    return manyClients || !uuid
      ? { label: "查看流量告警", path: "/admin/servers?alert=traffic" }
      : { label: "查看流量概览", path: "/admin/servers/" + uuid + "?tab=overview" };
  }

  if (profile.name === EVENT.ALERT) {
    return manyClients || !uuid
      ? { label: "查看资源告警", path: "/admin/servers?alert=resource" }
      : { label: "打开用量统计", path: "/admin/servers/" + uuid + "?tab=metrics" };
  }

  if (profile.name === EVENT.EXPIRE || profile.name === EVENT.RENEW) {
    return uuid
      ? { label: "查看账单信息", path: "/admin/servers/" + uuid + "?tab=billing" }
      : { label: "打开账单中心", path: "/admin/billing" };
  }

  if (profile.name === EVENT.OFFLINE || profile.name === EVENT.ONLINE) {
    return uuid
      ? { label: "查看服务器", path: "/admin/servers/" + uuid + "?tab=overview" }
      : { label: "打开服务器列表", path: "/admin/servers" };
  }

  if ([EVENT.DAILY_REPORT, EVENT.WEEKLY_REPORT, EVENT.MONTHLY_REPORT].includes(profile.name)) {
    return { label: "前往仪表盘", path: "/admin" };
  }

  if (profile.name === EVENT.LOGIN) {
    return { label: "查看登录记录", path: "/admin/logs" };
  }

  if (profile.name === EVENT.TEST) {
    return { label: "通知设置", path: "/admin/settings/notification" };
  }

  return uuid
    ? { label: "查看服务器", path: "/admin/servers/" + uuid + "?tab=overview" }
    : { label: "打开管理后台", path: "/admin" };
}

function renderNode(client) {
  const lines = ["<b>" + escapeHtml(clientName(client)) + "</b>"];
  const location = [client && client.region, client && (client.group || client.group_name)]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .map(escapeHtml);
  if (location.length) lines.push("<i>" + location.join(" · ") + "</i>");

  return lines.join("\n");
}

function renderClientContext(client, profile) {
  const lines = [];

  if (profile.name === EVENT.ALERT) {
    const specs = joinSpecs(client);
    if (specs) lines.push("<i>服务器配置</i>　" + escapeHtml(specs));
  }

  if (profile.name === EVENT.TRAFFIC && Number(client && client.traffic_limit) > 0) {
    const mode = String(client.traffic_limit_type || "max").toUpperCase();
    lines.push("流量限额　" + escapeHtml(formatBytes(client.traffic_limit)) + " · " + escapeHtml(mode));
  }

  if ([EVENT.EXPIRE, EVENT.RENEW].includes(profile.name)) {
    if (client && client.expired_at) {
      const expiry = new Date(client.expired_at);
      if (!Number.isNaN(expiry.getTime())) {
        lines.push("到期时间　" + escapeHtml(expiry.toISOString().slice(0, 10)));
      }
    }
    if (Number(client && client.price) > 0) {
      const currency = String(client.currency || "$");
      const cycle = Number(client.billing_cycle) > 0 ? " / " + client.billing_cycle + " 天" : "";
      lines.push("账单金额　" + escapeHtml(currency + client.price + cycle));
    }
  }

  return lines.join("\n");
}

function parseMessageFields(rawMessage) {
  const lines = String(rawMessage || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const heading = lines.length ? lines[0].replace(/^[📡💬⚠️✅❌\s]+/u, "") : "";
  const fields = lines.slice(1).map((line) => {
    const match = line.match(/^([^:：]+)[：:]\s*(.*)$/);
    return match ? { label: match[1].trim(), value: match[2].trim() } : { label: "", value: line };
  });
  return { heading, fields };
}

function renderFields(rawMessage, ignoredLabels) {
  const parsed = parseMessageFields(rawMessage);
  const ignored = new Set(ignoredLabels || []);
  const emphasized = new Set(["丢包", "线路变化", "识别置信度"]);
  const lines = [];
  parsed.fields
    .filter((field) => !ignored.has(field.label))
    .forEach((field) => {
      lines.push(field.label
        ? escapeHtml(field.label) + "　" +
          (emphasized.has(field.label)
            ? "<b>" + escapeHtml(field.value) + "</b>"
            : escapeHtml(field.value))
        : escapeHtml(field.value));
    });
  return lines.join("\n\n");
}

function renderTrafficDetails(rawMessage) {
  const text = String(rawMessage || "").trim();
  const match = text.match(/used\s+(\d+(?:\.\d+)?)%\s*\(([^/]+)\/\s*([^)]+)\),\s*type=([^\s]+)/i);
  if (!match) return escapeHtml(text);
  return [
    trafficProgress(match[1]) + "  <b>" + escapeHtml(match[1]) + "%</b>",
    "已用 " + escapeHtml(match[2].trim()) + "　·　限额 " + escapeHtml(match[3].trim()),
    "计费方式 " + escapeHtml(match[4].toUpperCase()),
  ].join("\n");
}

function reportPeriodLabel(eventName, rawMessage) {
  const match = String(rawMessage || "").match(/(今日|昨日|本周|上周|本月|上月|上个月)流量/);
  if (match) return match[1];
  if (eventName === EVENT.DAILY_REPORT) return "昨日";
  if (eventName === EVENT.WEEKLY_REPORT) return "上周";
  if (eventName === EVENT.MONTHLY_REPORT) return "上个月";
  return "本期";
}

function renderTrafficReport(event, profile) {
  const raw = String((event && event.message) || "").trim();
  if (!raw) return [];
  const period = reportPeriodLabel(profile.name, raw);
  const pattern = /^(.+?)\s+(?:今日|昨日|本周|上周|本月|上月|上个月)流量[：:]\s*(.+)$/;
  const records = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(pattern);
      if (!match) return escapeHtml(line);
      const details = match[2]
        .split(/[，,]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => escapeHtml(part.replace(/\s+/g, " ")));
      return "<b>" + escapeHtml(match[1]) + "</b>\n" + details.join("\n");
    });
  return ["<b>" + escapeHtml(period) + "用量</b> · " + records.length + " 台服务器", ...records];
}

function renderExpiryList(rawMessage) {
  const lines = String(rawMessage || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^[•\-]\s*(.+?)\s*\((\d+)d\)$/i);
      return match
        ? escapeHtml(match[1]) + "　<b>" + escapeHtml(match[2]) + " 天后到期</b>"
        : escapeHtml(line.replace(/^[•\-]\s*/, ""));
    });
  return lines.join("\n");
}

function renderRenewal(rawMessage) {
  const lines = String(rawMessage || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^[•\-]\s*(.+?)\s+until\s+(\d{4}-\d{2}-\d{2})/i);
      return match
        ? escapeHtml(match[1]) + "　续期至 <b>" + escapeHtml(match[2]) + "</b>"
        : escapeHtml(line.replace(/^[•\-]\s*/, ""));
    });
  return lines.join("\n");
}

function renderDetails(event, profile) {
  const raw = String((event && event.message) || "").trim();
  if (!raw) return [];

  if ([EVENT.DAILY_REPORT, EVENT.WEEKLY_REPORT, EVENT.MONTHLY_REPORT].includes(profile.name)) {
    return renderTrafficReport(event, profile);
  }
  if (profile.name === EVENT.PING_LOSS) {
    const details = renderFields(raw, ["服务器"]);
    return details ? [details] : [];
  }
  if (profile.name === EVENT.RETURN_ROUTE) {
    const details = renderFields(raw, []);
    return details ? [details] : [];
  }
  if (profile.name === EVENT.TRAFFIC) {
    const details = renderTrafficDetails(raw);
    return details ? [details] : [];
  }
  if (profile.name === EVENT.EXPIRE) {
    const details = renderExpiryList(raw);
    return details ? [details] : [];
  }
  if (profile.name === EVENT.RENEW) {
    const details = renderRenewal(raw);
    return details ? [details] : [];
  }
  if (profile.name === EVENT.ALERT) {
    return [];
  }

  return [escapeHtml(raw)];
}

function buildEventMessage(event, profile) {
  const blocks = [];
  const clients = asArray(event && event.clients);
  const showClients = ![EVENT.LOGIN, EVENT.DAILY_REPORT, EVENT.WEEKLY_REPORT, EVENT.MONTHLY_REPORT].includes(profile.name);

  if (showClients && clients.length === 1) {
    blocks.push(renderNode(clients[0]));
  }

  blocks.push(profile.icon + "　<b>" + escapeHtml(profile.title) + "</b>");

  if (showClients && clients.length === 1) {
    blocks.push(renderClientContext(clients[0], profile));
  } else if (showClients && clients.length > 1) {
    clients.forEach((client) => {
      blocks.push(renderNode(client));
      blocks.push(renderClientContext(client, profile));
    });
  }

  if (profile.note) blocks.push("<i>" + escapeHtml(profile.note) + "</i>");
  renderDetails(event, profile).forEach((detail) => blocks.push(detail));
  blocks.push("<code>" + escapeHtml(formatDisplayTime(event && event.time)) + "</code>  <i>UTC+" + TIME_ZONE_OFFSET + "</i>");
  return blocks.filter(Boolean).join("\n\n");
}

function buildKeyboard(target) {
  const primaryUrl = target && target.path ? panelUrl(target.path) : panelUrl("/admin");
  return { inline_keyboard: [[{ text: (target && target.label) || "打开管理后台", url: primaryUrl }]] };
}

async function telegramRequest(method, payload) {
  if (!TG_TOKEN || !TG_CHAT_ID) {
    console.error("Lite Telegram: TG_TOKEN or TG_CHAT_ID is empty");
    return false;
  }
  try {
    const response = await fetch("https://api.telegram.org/bot" + TG_TOKEN + "/" + method, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) return true;
    const detail = typeof response.text === "function" ? await response.text() : response.statusText;
    console.error("Lite Telegram " + method + " failed: " + response.status + " " + detail);
  } catch (error) {
    console.error("Lite Telegram " + method + " error: " + String(error));
  }
  return false;
}

function splitTelegramMessage(html, limit) {
  const maxLength = limit || 3900;
  const blocks = String(html || "").split("\n\n");
  const chunks = [];
  let current = "";

  blocks.forEach((block) => {
    const candidate = current ? current + "\n\n" + block : block;
    if (candidate.length <= maxLength) {
      current = candidate;
      return;
    }
    if (current) chunks.push(current);
    if (block.length <= maxLength) {
      current = block;
      return;
    }

    // Never split in the middle of an HTML tag. Extremely large individual
    // blocks lose styling, but keep their full readable content.
    const plain = block.replace(/<[^>]+>/g, "");
    for (let offset = 0; offset < plain.length; offset += maxLength) {
      chunks.push(escapeHtml(plain.slice(offset, offset + maxLength)));
    }
    current = "";
  });
  if (current) chunks.push(current);
  return chunks.length ? chunks : ["-"];
}

async function sendTextMessages(html, keyboard) {
  const chunks = splitTelegramMessage(html, 3900);
  for (let index = 0; index < chunks.length; index += 1) {
    const payload = {
      chat_id: TG_CHAT_ID,
      text: chunks[index],
      parse_mode: "HTML",
      disable_notification: false,
      link_preview_options: { is_disabled: true },
    };
    if (index === 0) payload.reply_markup = keyboard;
    const sent = await telegramRequest("sendMessage", payload);
    if (!sent) return false;
  }
  return true;
}

async function sendTelegram(html, target) {
  const keyboard = buildKeyboard(target);
  const photo = String(PHOTO_URL || "").trim();

  // Telegram limits photo captions to 1024 characters. Long reports stay as
  // text so no report row is lost merely to keep the banner attached.
  if (SEND_BRAND_IMAGE && photo && html.length <= 1000) {
    const photoSent = await telegramRequest("sendPhoto", {
      chat_id: TG_CHAT_ID,
      photo,
      caption: html,
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
    if (photoSent) return true;
  }

  return sendTextMessages(html, keyboard);
}

// Lite requires this function for ordinary text notifications and test sends.
globalThis.sendMessage = async function sendMessage(message, title) {
  const heading = String(title || "系统通知").trim();
  const html = [
    "🔔　<b>" + escapeHtml(heading) + "</b>",
    escapeHtml(String(message || "-").trim()),
    "<code>" + escapeHtml(formatDisplayTime()) + "</code>  <i>UTC+" + TIME_ZONE_OFFSET + "</i>",
  ].join("\n\n");
  return sendTelegram(html, { label: "打开管理后台", path: "/admin" });
};

// Lite calls this function for structured server events.
globalThis.sendEvent = async function sendEvent(event) {
  try {
    const safeEvent = event || {};
    const profile = resolveProfile(safeEvent);
    const target = resolveTarget(safeEvent, profile);
    const html = buildEventMessage(safeEvent, profile);
    return await sendTelegram(html, target);
  } catch (error) {
    console.error("Lite Telegram event error: " + String(error));
    return globalThis.sendMessage("通知格式化失败：" + String(error), "Telegram 通知异常");
  }
};
