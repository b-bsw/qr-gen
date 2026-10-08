import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import sharp from 'sharp'
import { parseQrQuery, rasterQrOptions } from '@/lib/qr'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
    let query: ReturnType<typeof parseQrQuery>
    try {
        query = parseQrQuery(request.nextUrl.searchParams)
    } catch (error) {
        return NextResponse.json(
            {
                error:
                    error instanceof Error
                        ? error.message
                        : 'Invalid QR parameters',
            },
            { status: 400 }
        )
    }
    const { text, format, options } = query
    const headers = {
        'Content-Type':
            format === 'svg'
                ? 'image/svg+xml; charset=utf-8'
                : format === 'jpg'
                  ? 'image/jpeg'
                  : 'image/png',
        'Content-Disposition': 'inline',
        'Cache-Control': 'no-store',
    }
    try {
        if (format === 'svg') {
            return new NextResponse(
                await QRCode.toString(text, { ...options, type: 'svg' }),
                { headers }
            )
        }
        const png = await QRCode.toBuffer(text, {
            ...rasterQrOptions(options),
            type: 'png',
        })
        // JPEG has no alpha channel. Match the white canvas used by downloads.
        const buffer =
            format === 'jpg'
                ? await sharp(png)
                      .flatten({ background: '#ffffff' })
                      .jpeg({ quality: 90 })
                      .toBuffer()
                : png
        return new NextResponse(new Uint8Array(buffer), { headers })
    } catch (error) {
        if (
            error instanceof Error &&
            /amount of data is too big/i.test(error.message)
        ) {
            return NextResponse.json(
                { error: 'Text is too long for a QR code' },
                { status: 400 }
            )
        }
        console.error('QR generation failed:', error)
        return NextResponse.json(
            { error: 'Unable to generate QR code' },
            { status: 500 }
        )
    }
}
