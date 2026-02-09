export default async function weather(request) {
  const url = new URL(request.url)
  const region = url.searchParams.get("region")

  if (!region) {
    return new Response("Missing region parameter", { status: 400 })
  }

  const apiUrl = `https://60s.viki.moe/v2/fuel-price?region=${encodeURIComponent(region)}`
  const resp = await fetch(apiUrl)
  const json = await resp.json()

  if (!json.data || !json.data.items) {
    return new Response("Fuel price API error", { status: 502 })
  }

  const data = json.data
  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z"
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")

  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fuel Price Calendar//CN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:汽油价格 (${region})`,
    `X-WR-CALDESC:实时汽油价格订阅`,
    "X-WR-TIMEZONE:Asia/Shanghai",
  ]

  // 主事件：展示所有价格
  let summary = `汽油价格 (${region})`
  let descLines = data.items.map(i => `${i.name}：${i.price_desc}`)
  descLines.push(`更新时间：${data.updated}`)

  ics.push(
    "BEGIN:VEVENT",
    `UID:${dateStr}-${region}@fuelprice`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${dateStr}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${descLines.join("\\n")}`,
    "END:VEVENT"
  )

  ics.push("END:VCALENDAR")

  return new Response(ics.join("\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "max-age=3600"  // 1 小时缓存
    }
  })
}