export default async function weather(request) {
  const url = new URL(request.url)
  const query = url.searchParams.get("query")
  const days = Math.min(
    parseInt(url.searchParams.get("days") || "3", 10),
    8
  )

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
    "PRODID:-//Weather Calendar 60s//CN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:天气预报（${query}）`,
    "X-WR-CALDESC:天气数据来自 60s API",
    "X-WR-TIMEZONE:Asia/Shanghai",
  ]

  for (const d of daily) {
    const start = d.date.replace(/-/g, "")
    const endDate = new Date(d.date)
    endDate.setDate(endDate.getDate() + 1)
    const end = endDate.toISOString().slice(0, 10).replace(/-/g, "")

    ics.push(
      "BEGIN:VEVENT",
      `UID:${start}-${query}@weather`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${query} ${d.day_condition} ${d.min_temperature}℃~${d.max_temperature}℃`,
      `DESCRIPTION:白天 ${d.day_condition}｜夜间 ${d.night_condition}`,
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