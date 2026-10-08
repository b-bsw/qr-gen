import type { QRCodeRenderersOptions } from 'qrcode'

export const formats = ['png', 'jpg', 'svg'] as const
export type ImageFormat = (typeof formats)[number]
export const correctionLevels = ['low', 'medium', 'quartile', 'high'] as const
export type ErrorCorrectionLevel = (typeof correctionLevels)[number]
export type Protocol = 'https' | 'http'

export function parseWebsiteInput(value: string, protocol: Protocol) {
    const match = value.match(/^\s*(https?):\/\//i)
    return {
        protocol: match ? (match[1].toLowerCase() as Protocol) : protocol,
        value: match ? value.slice(match[0].length) : value,
    }
}

export function websiteText(value: string, protocol: Protocol) {
    return value.trim() ? `${protocol}://${value.trim()}` : ''
}

export function qrOptions(
    width: number,
    fg: string,
    bg: string,
    errorCorrectionLevel: ErrorCorrectionLevel
): QRCodeRenderersOptions {
    return {
        width,
        margin: 4,
        color: { dark: fg, light: bg },
        errorCorrectionLevel,
    }
}

export function rasterQrOptions(options: QRCodeRenderersOptions) {
    return {
        ...options,
        // qrcode floors width after division and multiplication. A tiny offset
        // prevents floating point rounding from turning e.g. 128px into 127px.
        width: options.width === undefined ? undefined : options.width + 1e-7,
    }
}

export function imageLink(
    origin: string,
    text: string,
    format: ImageFormat,
    options: QRCodeRenderersOptions
) {
    const url = new URL('/qr', origin)
    url.search = new URLSearchParams({
        text,
        format,
        fg: String(options.color!.dark),
        bg: String(options.color!.light),
        quality: String(options.width),
        level: String(options.errorCorrectionLevel),
    }).toString()
    return url.toString()
}

export function parseQrQuery(params: URLSearchParams) {
    const text = params.get('text')
    const format = params.get('format') ?? 'png'
    const fg = params.get('fg') ?? '#000000'
    const bg = params.get('bg') ?? '#ffffff'
    const width = Number(params.get('quality') ?? '512')
    const level = params.get('level') ?? 'medium'

    if (!text?.trim()) throw new Error('Missing text query parameter')
    if (!formats.includes(format as ImageFormat))
        throw new Error('Invalid format query parameter')
    if (!Number.isInteger(width) || width < 21 || width > 2048)
        throw new Error('Quality must be an integer between 21 and 2048')
    const hex = /^#?(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i
    if (!hex.test(fg) || !hex.test(bg))
        throw new Error('Colors must be valid hexadecimal colors')
    if (!correctionLevels.includes(level as ErrorCorrectionLevel))
        throw new Error('Invalid error correction level')

    return {
        text,
        format: format as ImageFormat,
        options: qrOptions(width, fg, bg, level as ErrorCorrectionLevel),
    }
}
