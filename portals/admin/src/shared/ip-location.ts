const ipLocationPrefixes: Array<[string, string]> = [
  ["101.33.", "上海"],
  ["111.206.", "北京"],
  ["183.129.", "杭州"],
  ["112.93.", "深圳"],
  ["115.236.", "杭州"],
  ["221.12.", "杭州"],
  ["58.247.", "上海"],
  ["123.125.", "北京"],
  ["36.112.", "北京"],
  ["120.92.", "北京"],
  ["171.221.", "成都"],
  ["182.150.", "成都"],
  ["119.29.", "深圳"],
];

function isPrivateIp(ip: string) {
  if (ip.startsWith("10.") || ip.startsWith("192.168.")) return true;

  const [first = Number.NaN, second = Number.NaN] = ip
    .split(".")
    .map((segment) => Number(segment));
  return first === 172 && second >= 16 && second <= 31;
}

export function resolveIpLocation(ip?: string | null) {
  if (!ip) return "未知地址";
  if (isPrivateIp(ip)) return "内网地址";

  const matchedLocation = ipLocationPrefixes.find(([prefix]) =>
    ip.startsWith(prefix),
  )?.[1];
  return matchedLocation ?? "未知地址";
}
