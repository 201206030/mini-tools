declare module 'qrcode-generator' {
  interface QRCodeModel {
    addData(data: string, mode?: string): void
    make(): void
    getModuleCount(): number
    isDark(row: number, col: number): boolean
  }

  interface QRCodeFactory {
    (typeNumber: number, errorCorrectionLevel: string): QRCodeModel
    stringToBytes: (text: string) => number[]
    stringToBytesFuncs: Record<string, (text: string) => number[]>
  }

  const qrcode: QRCodeFactory
  export = qrcode
}
