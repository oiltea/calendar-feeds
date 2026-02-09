export default async function weather(request) {
  const url = new URL(request.url)
  const query = url.searchParams.get("query")
  const days = Math.min(parseInt(url.searchParams.get("days") || "3", 10), 8)

  if (!query) {
    return new Response("Missing query parameter", { status: 400 })
  }

  const api = `https://60s.viki.moe/v2/weather/forecast?query=${encodeURIComponent(query)}&days=${days}`
  const resp = await fetch(api)
  const json = await resp.json()
  const daily = json?.data?.daily_forecast

  if (!daily) {
    return new Response("Weather API error", { status: 502 })
  }

  const now = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z"

  let ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Weather Calendar//CN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:天气预报（${query}）`,
    "X-WR-CALDESC:数据来自 60s API",
    "X-WR-TIMEZONE:Asia/Shanghai",
  ]

  for (const d of daily) {
    const start = d.date.replace(/-/g, "")
    const endDate = new Date(d.date)
    endDate.setDate(endDate.getDate() + 1)
    const end = endDate.toISOString().slice(0, 10).replace(/-/g, "")

    const descLines = []
    descLines.push(`📆 日期：${d.date}`)
    descLines.push(`🌡 温度：${d.min_temperature}℃~${d.max_temperature}℃`)
    descLines.push(`☀ 白天天气：${d.day_condition}`)
    descLines.push(`🌙 夜间天气：${d.night_condition}`)
    descLines.push(`😷 空气质量：${d.air_quality}`)
    descLines.push(`🔗 数据来源：腾讯天气`)

    ics.push(
      "BEGIN:VEVENT",
      `UID:${start}-${query}@weather`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${query} ${d.day_condition} ${d.min_temperature}℃~${d.max_temperature}℃`,
      `DESCRIPTION:${descLines.join("\\n\\n")}`,
      "END:VEVENT"
    )
  }

  ics.push("END:VCALENDAR")

  return new Response(ics.join("\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "max-age=1800",
    },
  })
}