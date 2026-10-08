'use client'
import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import {
    Button,
    ButtonGroup,
    Card,
    InputGroup,
    ListBox,
    Select,
    TextField,
    Toast,
    toast,
    ColorPicker,
    ColorArea,
    ColorSlider,
    ColorSwatch,
    ColorField,
    Color,
    parseColor,
    Spinner,
    Label,
    Tooltip,
    CloseButton,
    Switch,
} from '@heroui/react'
import { Check, Copy, Moon, Sun } from 'lucide-react'
import { useTheme } from './providers'
import {
    imageLink,
    parseWebsiteInput,
    qrOptions,
    rasterQrOptions,
    websiteText,
    type ErrorCorrectionLevel,
    type ImageFormat,
} from '@/lib/qr'

const format = [
    {
        key: 1,
        value: 'png',
        name: 'PNG',
    },
    {
        key: 2,
        value: 'jpg',
        name: 'JPG',
    },
    {
        key: 3,
        value: 'svg',
        name: 'SVG',
    },
]

const errCorrLvl = [
    { id: 1, level: 'low' },
    { id: 2, level: 'medium' },
    { id: 3, level: 'quartile' },
    { id: 4, level: 'high' },
]

const qualityLevel = [
    { id: 1, q: 128 },
    { id: 2, q: 512 },
    { id: 3, q: 1024 },
    { id: 4, q: 2048 },
]

const placeholderURL = 'https://qr.b-bsw.com'

export default function Page() {
    const [website, setWebsite] = useState(
        placeholderURL.slice('https://'.length)
    )
    const [generated, setGenerated] = useState<{
        key: string
        image: string | null
        svg: string | null
        error: string | null
    } | null>(null)
    const [copiedText, setCopiedText] = useState<string | null>(null)
    const [colorPickerFg, setColorPickerFg] = useState<Color>(
        parseColor('#000000')
    )
    const [colorPickerBg, setColorPickerBg] = useState<Color>(
        parseColor('#FFFFFF')
    )
    const [level, setLevel] = useState<ErrorCorrectionLevel>('medium')
    const [selectedFormat, setSelectedFormat] = useState<ImageFormat>('png')
    const [selectQuality, setSelectQuality] = useState<number>(512)
    const [swapHttps, setSwapHttps] = useState<'https' | 'http'>('https')

    const { theme, setTheme } = useTheme()
    const text = websiteText(website, swapHttps)
    const isCheckCopy = Boolean(text && copiedText === text)
    const fg = colorPickerFg.toString('hexa')
    const bg = colorPickerBg.toString('hexa')
    const generationKey = JSON.stringify([text, fg, bg, level, selectQuality])
    const current = generated?.key === generationKey ? generated : null
    const qrImage = current?.image ?? null
    const qrSvg = current?.svg ?? null
    const generationError = current?.error ?? null
    const isReady = Boolean(text && qrImage && qrSvg)

    useEffect(() => {
        if (!text) return
        let cancelled = false
        const options = qrOptions(selectQuality, fg, bg, level)
        async function generate() {
            try {
                const [image, svg] = await Promise.all([
                    QRCode.toDataURL(text, rasterQrOptions(options)),
                    QRCode.toString(text, { ...options, type: 'svg' }),
                ])
                if (!cancelled)
                    setGenerated({
                        key: generationKey,
                        image,
                        svg,
                        error: null,
                    })
            } catch {
                if (!cancelled)
                    setGenerated({
                        key: generationKey,
                        image: null,
                        svg: null,
                        error: 'Unable to generate QR code. Try shorter text.',
                    })
            }
        }
        void generate()
        return () => {
            cancelled = true
        }
    }, [text, fg, bg, level, selectQuality, generationKey])

    const saveImage = (url: string, format: ImageFormat) => {
        const a = document.createElement('a')
        a.href = url
        a.download = `qrcode.${format}`
        document.body.appendChild(a)
        a.click()
        a.remove()
    }

    const handleDownload = async () => {
        if (!isReady || !qrImage || !qrSvg) return
        try {
            if (selectedFormat === 'svg') {
                const url = URL.createObjectURL(
                    new Blob([qrSvg], { type: 'image/svg+xml' })
                )
                saveImage(url, 'svg')
                // Allow the browser to start reading the blob before releasing it.
                window.setTimeout(() => URL.revokeObjectURL(url), 1000)
            } else if (selectedFormat === 'png') {
                saveImage(qrImage, 'png')
            } else {
                const img = new Image()
                img.src = qrImage
                await img.decode()
                const canvas = document.createElement('canvas')
                canvas.width = img.naturalWidth
                canvas.height = img.naturalHeight
                const ctx = canvas.getContext('2d')
                if (!ctx) throw new Error('Canvas unavailable')
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, canvas.width, canvas.height)
                ctx.drawImage(img, 0, 0)
                saveImage(canvas.toDataURL('image/jpeg', 0.9), 'jpg')
            }
        } catch {
            toast.danger('Unable to download QR code')
        }
    }

    const copyLink = async () => {
        if (!isReady) return
        try {
            await navigator.clipboard.writeText(
                imageLink(
                    window.location.origin,
                    text,
                    selectedFormat,
                    qrOptions(selectQuality, fg, bg, level)
                )
            )
            toast.info('Copy Success')
        } catch {
            toast.danger('Unable to copy link')
        }
    }

    const copyText = async () => {
        if (!text) return
        try {
            await navigator.clipboard.writeText(text)
            setCopiedText(text)
        } catch {
            toast.danger('Unable to copy URL')
        }
    }

    const handleSetText = (value: string) => {
        const parsed = parseWebsiteInput(value, swapHttps)
        setWebsite(parsed.value)
        setSwapHttps(parsed.protocol)
    }

    const colorPicker = [
        {
            id: 1,
            value: colorPickerFg,
            set: setColorPickerFg,
            label: 'Foreground',
        },
        {
            id: 2,
            value: colorPickerBg,
            set: setColorPickerBg,
            label: 'Background',
        },
    ]

    return (
        <>
            <header className="absolute top-0 z-1 flex w-full flex-row-reverse pt-4 pr-4">
                <Switch
                    size="lg"
                    aria-label="Dark mode"
                    onChange={(selected) =>
                        setTheme(selected ? 'dark' : 'light')
                    }
                    isSelected={theme === 'dark'}
                >
                    <Switch.Control className="h-7.75 w-12.75">
                        <Switch.Thumb className="size-6.75">
                            <Switch.Icon>
                                {theme === 'dark' ? (
                                    <Moon size={16} />
                                ) : (
                                    <Sun size={16} />
                                )}
                            </Switch.Icon>
                        </Switch.Thumb>
                    </Switch.Control>
                </Switch>
            </header>

            <div className="flex h-full flex-col items-center justify-center overflow-auto transition-all">
                <Toast.Provider placement="bottom end" />
                <Card
                    variant="tertiary"
                    className="overflow-auto max-sm:rounded-none max-sm:bg-white max-sm:shadow-none max-sm:dark:bg-[#121212]"
                >
                    <Card.Title className="text-2xl max-sm:text-center">
                        <span className="text-black dark:text-white">
                            QRCODE
                        </span>
                    </Card.Title>
                    <div className="flex min-w-full justify-center">
                        <section
                            className={`h-86 w-86 rounded-lg p-1 max-sm:w-full`}
                        >
                            {text && (
                                <div className="flex h-full flex-col items-center justify-center">
                                    {qrImage ? (
                                        <img
                                            loading="lazy"
                                            src={qrImage}
                                            alt="QR Code"
                                            className="h-full w-full object-contain sm:rounded-xl sm:drop-shadow-sm"
                                        />
                                    ) : generationError ? (
                                        <p
                                            role="alert"
                                            className="text-danger px-4 text-center"
                                        >
                                            {generationError}
                                        </p>
                                    ) : (
                                        <Spinner color="current" />
                                    )}
                                </div>
                            )}
                        </section>
                    </div>

                    <div className="flex w-full justify-center gap-5">
                        {colorPicker.map((c) => (
                            <ColorPicker
                                key={c.id}
                                value={c.value}
                                onChange={c.set}
                            >
                                <ColorPicker.Trigger>
                                    <ColorSwatch size="lg" />
                                    <Label className="text-black dark:text-white">
                                        <span>{c.label}</span>
                                    </Label>
                                </ColorPicker.Trigger>
                                <ColorPicker.Popover className="gap-2">
                                    <ColorArea
                                        aria-label="Color area"
                                        className="max-w-full"
                                        colorSpace="hsb"
                                        xChannel="saturation"
                                        yChannel="brightness"
                                    >
                                        <ColorArea.Thumb />
                                    </ColorArea>
                                    <div className="flex flex-col items-center gap-2 px-1">
                                        <ColorSlider
                                            aria-label="Hue slider"
                                            channel="hue"
                                            className="flex-1"
                                            colorSpace="hsb"
                                        >
                                            <ColorSlider.Track>
                                                <ColorSlider.Thumb />
                                            </ColorSlider.Track>
                                        </ColorSlider>

                                        <ColorSlider
                                            aria-label="alpha slider"
                                            channel="alpha"
                                            className="flex-1"
                                            colorSpace="rgb"
                                        >
                                            <ColorSlider.Track>
                                                <ColorSlider.Thumb />
                                            </ColorSlider.Track>
                                        </ColorSlider>
                                    </div>
                                    <ColorField aria-label="Color field">
                                        <ColorField.Group variant="secondary">
                                            <ColorField.Prefix>
                                                <ColorSwatch size="xs" />
                                            </ColorField.Prefix>
                                            <ColorField.Input />
                                        </ColorField.Group>
                                    </ColorField>
                                </ColorPicker.Popover>
                            </ColorPicker>
                        ))}
                    </div>

                    {/*INPUT URL*/}
                    <section className="flex w-full flex-col items-center justify-center gap-2">
                        <div className="w-full">
                            <TextField
                                className="w-full"
                                value={website}
                                onChange={handleSetText}
                                name="website"
                                // variant="secondary"
                                aria-label="input url"
                            >
                                <InputGroup>
                                    <Tooltip delay={500}>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            aria-label={`Switch to ${swapHttps === 'http' ? 'https' : 'http'}`}
                                            onPress={() => {
                                                setSwapHttps(
                                                    swapHttps === 'http'
                                                        ? 'https'
                                                        : 'http'
                                                )
                                            }}
                                        >
                                            {swapHttps}://
                                        </Button>
                                        <Tooltip.Content
                                            className={
                                                'border px-3 py-1.5 font-semibold'
                                            }
                                            showArrow={true}
                                            offset={20}
                                        >
                                            <p>
                                                Switch to{' '}
                                                <span className="text-red-600">
                                                    {swapHttps === 'http'
                                                        ? 'https://'
                                                        : 'http://'}
                                                </span>
                                            </p>
                                        </Tooltip.Content>
                                    </Tooltip>

                                    <InputGroup.Input />

                                    {website && (
                                        <InputGroup.Suffix className="pr-0">
                                            <CloseButton
                                                aria-label="Clear URL"
                                                className="scale-75"
                                                onPress={() =>
                                                    handleSetText('')
                                                }
                                            />
                                        </InputGroup.Suffix>
                                    )}
                                    <InputGroup.Suffix className="pr-0">
                                        <Button
                                            isIconOnly
                                            aria-label="Copy"
                                            size="sm"
                                            variant="ghost"
                                            isDisabled={!text || isCheckCopy}
                                            onPress={copyText}
                                        >
                                            {isCheckCopy ? <Check /> : <Copy />}
                                        </Button>
                                    </InputGroup.Suffix>
                                </InputGroup>
                            </TextField>
                        </div>
                        {/*Selection*/}
                        <div className="flex w-full flex-col items-center gap-3">
                            <div className="flex w-full items-center gap-2">
                                {/*Format type*/}
                                <Select
                                    className="w-full"
                                    placeholder="Select one"
                                    // variant="secondary"
                                    value={selectedFormat}
                                    aria-label="format"
                                    onChange={(e) =>
                                        setSelectedFormat(e as ImageFormat)
                                    }
                                >
                                    <Label className="w-full text-center text-xs text-black dark:text-white">
                                        Format type
                                    </Label>
                                    <Select.Trigger>
                                        <Select.Value />
                                        <Select.Indicator />
                                    </Select.Trigger>
                                    <Select.Popover>
                                        {format && (
                                            <ListBox>
                                                {format.map((f) => (
                                                    <ListBox.Item
                                                        key={f.key}
                                                        id={f.value}
                                                        textValue={f.value}
                                                    >
                                                        {f.name}
                                                        <ListBox.ItemIndicator />
                                                    </ListBox.Item>
                                                ))}
                                            </ListBox>
                                        )}
                                    </Select.Popover>
                                </Select>

                                {/*Level*/}
                                <Select
                                    className="w-full"
                                    placeholder="Select one"
                                    // variant="secondary"
                                    value={level}
                                    aria-label="level"
                                    onChange={(e) =>
                                        setLevel(e as ErrorCorrectionLevel)
                                    }
                                >
                                    <Label className="w-full text-center text-xs text-black dark:text-white">
                                        Error Correction
                                    </Label>
                                    <Select.Trigger>
                                        <Select.Value />
                                        <Select.Indicator />
                                    </Select.Trigger>
                                    <Select.Popover>
                                        <ListBox>
                                            {errCorrLvl.map((lvl) => (
                                                <ListBox.Item
                                                    key={lvl.id}
                                                    id={lvl.level}
                                                    textValue={lvl.level}
                                                >
                                                    <span className="uppercase">
                                                        {lvl.level}
                                                    </span>
                                                    <ListBox.ItemIndicator />
                                                </ListBox.Item>
                                            ))}
                                        </ListBox>
                                    </Select.Popover>
                                </Select>

                                {/*Quality*/}
                                <Select
                                    className="w-full"
                                    placeholder="Select one"
                                    // variant="secondary"
                                    value={selectQuality}
                                    aria-label="quality"
                                    onChange={(e) =>
                                        setSelectQuality(Number(e))
                                    }
                                >
                                    <Label className="w-full text-center text-xs text-black dark:text-white">
                                        Quality
                                    </Label>
                                    <Select.Trigger>
                                        <Select.Value />
                                        <Select.Indicator />
                                    </Select.Trigger>
                                    <Select.Popover>
                                        <ListBox>
                                            {qualityLevel.map((q) => (
                                                <ListBox.Item
                                                    key={q.id}
                                                    id={q.q}
                                                    textValue={q.q.toString()}
                                                >
                                                    <span className="uppercase">
                                                        {q.q}
                                                    </span>
                                                    <ListBox.ItemIndicator />
                                                </ListBox.Item>
                                            ))}
                                        </ListBox>
                                    </Select.Popover>
                                </Select>
                            </div>
                            <div className="flex w-full justify-center gap-2">
                                <ButtonGroup
                                    variant="tertiary"
                                    fullWidth
                                    className="rounded-xl shadow-sm **:bg-white **:first:rounded-l-xl **:last:rounded-r-xl **:hover:bg-zinc-50 **:dark:bg-[#19191c]"
                                >
                                    <Button
                                        onPress={handleDownload}
                                        isDisabled={!isReady}
                                    >
                                        Download
                                    </Button>
                                    <Button
                                        onPress={copyLink}
                                        isDisabled={!isReady}
                                    >
                                        <ButtonGroup.Separator />
                                        Copy QR Code Image Link
                                    </Button>
                                </ButtonGroup>
                            </div>
                        </div>
                    </section>
                </Card>
            </div>
        </>
    )
}
