declare module "*.cjs" {
  const value: Parameters<typeof import("cn/config").createCn>[0]
  export default value
}
