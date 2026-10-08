import { describe, expect, test } from 'bun:test'
import { NextRequest } from 'next/server'
import sharp from 'sharp'
import QRCode from 'qrcode'
import { GET } from '../src/app/qr/route'
import {
    imageLink,
    parseWebsiteInput,
    qrOptions,
    websiteText,
} from '../src/lib/qr'

const request = (params) =>
    new NextRequest(`http://localhost/qr?${new URLSearchParams(params)}`)

describe('Website input', () => {
    test('pasted URLs keep their protocol and embedded URLs', () => {
        const input = parseWebsiteInput(
            'HTTP://example.com/?next=https://other.test',
            'https'
        )
        expect(input.protocol).toBe('http')
        expect(websiteText(input.value, input.protocol)).toBe(
            'http://example.com/?next=https://other.test'
        )
    })
    test('cleared and whitespace-only fields generate no URL', () => {
        expect(websiteText('', 'https')).toBe('')
        expect(websiteText('   ', 'http')).toBe('')
        expect(parseWebsiteInput('https://', 'http').value).toBe('')
    })
    test('switching protocol keeps the entire address', () => {
        expect(websiteText('example.com/path?a=1&b=2#hash', 'http')).toBe(
            'http://example.com/path?a=1&b=2#hash'
        )
    })
})

describe('QR API', () => {
    for (const quality of [128, 512, 1024, 2048]) {
        test(`raster dimensions stay at ${quality}px despite floating point rounding`, async () => {
            const response = await GET(
                request({
                    text: 'https://example.com/path?a=1&next=http://other.test',
                    quality: String(quality),
                    level: 'high',
                })
            )
            expect(response.status).toBe(200)
            const metadata = await sharp(
                Buffer.from(await response.arrayBuffer())
            ).metadata()
            expect(metadata.width).toBe(quality)
            expect(metadata.height).toBe(quality)
        })
    }
    test('missing quality defaults to a 512px PNG', async () => {
        const response = await GET(request({ text: 'https://example.com' }))
        expect(response.status).toBe(200)
        expect(response.headers.get('Content-Type')).toBe('image/png')
        const metadata = await sharp(
            Buffer.from(await response.arrayBuffer())
        ).metadata()
        expect(metadata.width).toBe(512)
        expect(metadata.height).toBe(512)
    })

    test('image links preserve text, colors, quality and correction level', async () => {
        const text = 'https://example.com/ไทย?a=1&next=https://other.test#hash'
        const options = qrOptions(128, '#123456aa', '#ffffff00', 'high')
        const url = imageLink('http://localhost', text, 'svg', options)
        const response = await GET(new NextRequest(url))
        expect(response.status).toBe(200)
        expect(response.headers.get('Content-Type')).toContain('image/svg+xml')
        expect(await response.text()).toBe(
            await QRCode.toString(text, { ...options, type: 'svg' })
        )
    })

    test('JPEG flattens transparency onto white', async () => {
        const response = await GET(
            request({
                text: 'test',
                format: 'jpg',
                quality: '128',
                bg: '#ff000000',
            })
        )
        expect(response.status).toBe(200)
        expect(response.headers.get('Content-Type')).toBe('image/jpeg')
        const image = sharp(Buffer.from(await response.arrayBuffer()))
        const metadata = await image.metadata()
        expect(metadata.width).toBe(128)
        expect(metadata.hasAlpha).toBe(false)
        const pixel = await image
            .extract({ left: 0, top: 0, width: 1, height: 1 })
            .raw()
            .toBuffer()
        expect([...pixel]).toEqual([255, 255, 255])
    })

    for (const params of [
        {},
        { text: ' ' },
        { text: 'test', format: 'gif' },
        ...['', '0', '-1', 'NaN', 'Infinity', '20', '128.5', '2049'].map(
            (quality) => ({ text: 'test', quality })
        ),
        { text: 'test', fg: '#ggg' },
        { text: 'test', bg: '#12345' },
        { text: 'test', level: 'invalid' },
    ]) {
        test(`rejects invalid input ${JSON.stringify(params)}`, async () => {
            const response = await GET(request(params))
            expect(response.status).toBe(400)
            expect((await response.json()).error).toBeString()
        })
    }

    test('oversized payload returns a useful 400 response', async () => {
        const response = await GET(request({ text: 'a'.repeat(10000) }))
        expect(response.status).toBe(400)
        expect((await response.json()).error).toContain('too long')
    })
})
