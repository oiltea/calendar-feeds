export default async function fuelPrice(request) {
  const url = new URL(request.url)
  const region = url.searchParams.get("region")
  const primary = url.searchParams.get("primary")

  if (!region) {
    return new Response("Missing region parameter", { status: 400 })
  }

  const api = `https://60s.viki.moe/v2/fuel-price?region=${encodeURIComponent(region)}`
  const resp = await fetch(api)
  const json = await resp.json()
  const data = json?.data

  if (!data) {
    return new Response("Fuel Price API error", { status: 502 })
  }

  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z"
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")

  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fuel Price Calendar//CN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:燃油价格 (${region})`,
    `X-WR-CALDESC:数据来自 60s API`,
    "X-WR-TIMEZONE:Asia/Shanghai",
  ]

  const item = data.items.find(i => i.name.includes(primary))

  // 主事件：展示所有价格
  let summary = `${region} ${item?.name} ${item?.price_desc}`
  let descLines = data.items.map(i => `${i.name}：${i.price_desc}`)
  descLines.push(`更新时间：${data.updated}`)

  ics.push(
    "BEGIN:VEVENT",
    `UID:${dateStr}-${region}-${primary}@fuelprice`,
    `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${dateStr}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${descLines.join("\\n\\n")}`,
    "END:VEVENT"
  )

  ics.push("END:VCALENDAR")

  return new Response(ics.join("\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "max-age=3600"
    }
  })
}