"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import {
  Clock3,
  Database,
  History as HistoryIcon,
  Loader2,
  Moon,
  SendHorizontal,
  Sun,
  Trash2,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
type HeaderRow = { id: string; key: string; value: string; enabled: boolean }
type HistoryEntry = {
  id: string
  method: HttpMethod
  url: string
  status?: number
  timeMs?: number
  timestamp: number
}
type ResponseSnapshot = {
  ok: boolean
  status: number
  statusText: string
  timeMs: number
  size: number
  headers: { key: string; value: string }[]
  body: string
  rawBody: string
  contentType: string
}

const HISTORY_STORAGE_KEY = "postman_clone_history_v1"
const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"]
const DEFAULT_URL = "https://jsonplaceholder.typicode.com/posts/1"
const HISTORY_LIMIT = 25

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

const formatBytes = (size?: number) => {
  if (size === undefined || Number.isNaN(size)) return "-"
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

const statusVariant = (
  status?: number
): "default" | "secondary" | "destructive" | "outline" => {
  if (!status) return "secondary"
  if (status >= 200 && status < 300) return "default"
  if (status >= 400) return "destructive"
  return "outline"
}

const tryFormatJson = (payload: string) => {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2)
  } catch {
    return payload
  }
}

export default function Home() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [method, setMethod] = React.useState<HttpMethod>("GET")
  const [url, setUrl] = React.useState(DEFAULT_URL)
  const [headers, setHeaders] = React.useState<HeaderRow[]>([
    { id: createId(), key: "Accept", value: "application/json", enabled: true },
  ])
  const [body, setBody] = React.useState('{\n  "title": "Hello from Postman Clone"\n}')
  const [response, setResponse] = React.useState<ResponseSnapshot | null>(null)
  const [history, setHistory] = React.useState<HistoryEntry[]>([])
  const [sending, setSending] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => setMounted(true), [])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const saved = window.localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!saved) return
    try {
      const parsed = JSON.parse(saved) as HistoryEntry[]
      setHistory(parsed)
    } catch {
      // ignore malformed history
    }
  }, [])

  const persistHistory = React.useCallback((items: HistoryEntry[]) => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(items.slice(0, HISTORY_LIMIT))
    )
  }, [])

  const pushHistory = React.useCallback(
    (entry: HistoryEntry) => {
      setHistory((prev) => {
        const next = [entry, ...prev].slice(0, HISTORY_LIMIT)
        persistHistory(next)
        return next
      })
    },
    [persistHistory]
  )

  const clearHistory = React.useCallback(() => {
    setHistory([])
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(HISTORY_STORAGE_KEY)
    }
  }, [])

  const updateHeader = React.useCallback(
    (id: string, field: keyof Omit<HeaderRow, "id">, value: string | boolean) =>
      setHeaders((current) =>
        current.map((header) =>
          header.id === id ? { ...header, [field]: value } : header
        )
      ),
    []
  )

  const removeHeader = React.useCallback(
    (id: string) => setHeaders((current) => current.filter((item) => item.id !== id)),
    []
  )

  const addHeaderRow = React.useCallback(
    () =>
      setHeaders((current) => [
        ...current,
        { id: createId(), key: "", value: "", enabled: true },
      ]),
    []
  )

  const applyHistoryEntry = React.useCallback(
    (entry: HistoryEntry) => {
      setMethod(entry.method)
      setUrl(entry.url)
      setResponse(null)
      setErrorMessage(null)
    },
    []
  )

  const handleSend = React.useCallback(async () => {
    if (!url.trim()) {
      setErrorMessage("Please enter a URL.")
      return
    }

    setSending(true)
    setResponse(null)
    setErrorMessage(null)

    const start = performance.now()
    const activeHeaders = headers
      .filter((item) => item.enabled && item.key.trim())
      .reduce<Record<string, string>>((acc, curr) => {
        acc[curr.key.trim()] = curr.value.trim()
        return acc
      }, {})

    const init: RequestInit = {
      method,
      headers: activeHeaders,
    }

    const hasBody = method !== "GET" && body.trim().length > 0
    const looksLikeJson =
      body.trim().startsWith("{") || body.trim().startsWith("[")
    const hasContentType = Object.keys(activeHeaders).some(
      (key) => key.toLowerCase() === "content-type"
    )

    if (hasBody) {
      if (!hasContentType && looksLikeJson) {
        activeHeaders["Content-Type"] = "application/json"
      }
      init.body = body
    }

    try {
      const res = await fetch(url, init)
      const text = await res.text()
      const elapsed = Math.round(performance.now() - start)
      const size =
        typeof TextEncoder !== "undefined"
          ? new TextEncoder().encode(text).length
          : text.length
      const contentType = res.headers.get("content-type") ?? "unknown"
      const headerEntries = Array.from(res.headers.entries()).map(
        ([key, value]) => ({ key, value })
      )

      setResponse({
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        timeMs: elapsed,
        size,
        headers: headerEntries,
        body:
          contentType.includes("application/json") || looksLikeJson
            ? tryFormatJson(text)
            : text || "Empty body",
        rawBody: text,
        contentType,
      })

      pushHistory({
        id: createId(),
        method,
        url,
        status: res.status,
        timeMs: elapsed,
        timestamp: Date.now(),
      })
    } catch (error) {
      const elapsed = Math.round(performance.now() - start)
      setErrorMessage(
        error instanceof Error ? error.message : "Request failed."
      )
      pushHistory({
        id: createId(),
        method,
        url,
        timeMs: elapsed,
        timestamp: Date.now(),
      })
    } finally {
      setSending(false)
    }
  }, [body, headers, method, pushHistory, url])

  const themeIsDark = mounted && theme === "dark"

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <header className="border-b bg-card/30">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg text-sm font-semibold">
              AI
            </div>
            <div>
              <div className="text-lg font-semibold">Postman Clone</div>
              <p className="text-muted-foreground text-sm">
                Build, send, and inspect HTTP requests.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(themeIsDark ? "light" : "dark")}
              disabled={!mounted}
            >
              {themeIsDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-6">
        <ResizablePanelGroup direction="horizontal" className="gap-4">
          <ResizablePanel defaultSize={55} minSize={40} className="flex flex-col gap-4">
            <Card>
              <CardHeader className="border-b pb-4">
                <CardTitle>Request</CardTitle>
                <CardDescription>
                  Configure the method, target, headers, and body.
                </CardDescription>
                <CardAction>
                  <Button onClick={handleSend} disabled={sending}>
                    {sending ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <SendHorizontal className="mr-2 size-4" />
                        Send
                      </>
                    )}
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-medium text-foreground">
                    Method & URL
                  </Label>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <Select value={method} onValueChange={(value: HttpMethod) => setMethod(value)}>
                      <SelectTrigger className="md:w-32">
                        <SelectValue placeholder="Metod" />
                      </SelectTrigger>
                      <SelectContent>
                        {METHODS.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      placeholder="https://api.example.com/resource"
                      className="flex-1"
                    />
                  </div>
                </div>

                <Tabs defaultValue="headers" className="flex flex-col gap-3">
                  <TabsList>
                    <TabsTrigger value="headers">Headers</TabsTrigger>
                    <TabsTrigger value="body">Body</TabsTrigger>
                  </TabsList>

                  <TabsContent value="headers" className="space-y-3">
                    <div className="space-y-2">
                      {headers.map((header) => (
                        <div
                          key={header.id}
                          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-2"
                        >
                          <Input
                            placeholder="Key"
                            value={header.key}
                            onChange={(event) =>
                              updateHeader(header.id, "key", event.target.value)
                            }
                          />
                          <Input
                            placeholder="Value"
                            value={header.value}
                            onChange={(event) =>
                              updateHeader(header.id, "value", event.target.value)
                            }
                          />
                          <Button
                            variant={header.enabled ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => updateHeader(header.id, "enabled", !header.enabled)}
                          >
                            {header.enabled ? "On" : "Off"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeHeader(header.id)}
                            aria-label="Delete header"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={addHeaderRow}>
                        Add header
                      </Button>
                      <p className="text-muted-foreground text-xs">
                        Empty rows are ignored.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="body" className="space-y-2">
                    <Label htmlFor="body">Request body</Label>
                    <Textarea
                      id="body"
                      value={body}
                      disabled={method === "GET"}
                      onChange={(event) => setBody(event.target.value)}
                      className="font-mono"
                      rows={10}
                      placeholder='{"title": "Hello"}'
                    />
                    <p className="text-muted-foreground text-xs">
                      GET requests do not send a body.
                    </p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b pb-4">
                <CardTitle>History</CardTitle>
                <CardDescription>Stored only in this browser.</CardDescription>
                <CardAction>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    disabled={!history.length}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Clear
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[320px]">
                  <div className="divide-y">
                    {history.length === 0 ? (
                      <div className="text-muted-foreground px-6 py-4 text-sm">
                        No requests yet. Send one to see it here.
                      </div>
                    ) : (
                      history.map((entry) => (
                        <button
                          key={entry.id}
                          className="hover:bg-accent/60 flex w-full items-start gap-3 px-6 py-3 text-left transition"
                          onClick={() => applyHistoryEntry(entry)}
                        >
                          <Badge variant={statusVariant(entry.status)}>
                            {entry.status ?? "-"}
                          </Badge>
                          <div className="flex flex-1 flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{entry.method}</Badge>
                              <span className="truncate text-sm font-medium">{entry.url}</span>
                            </div>
                            <div className="text-muted-foreground flex items-center gap-2 text-xs">
                              <HistoryIcon className="size-3.5" />
                              <span>
                                {entry.timeMs ? `${entry.timeMs} ms` : "-"} |{" "}
                                {new Date(entry.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={45} minSize={35}>
            <Card className="h-full">
              <CardHeader className="border-b pb-4">
                <CardTitle>Response</CardTitle>
                <CardDescription>Status, time, size, and body.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="border-input bg-muted/40 rounded-lg border p-3">
                    <p className="text-muted-foreground text-xs">Status</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={statusVariant(response?.status)}>
                        {response ? response.status : "-"}
                      </Badge>
                      <span className="text-sm">
                        {response ? response.statusText : "Not sent"}
                      </span>
                    </div>
                  </div>
                  <div className="border-input bg-muted/40 rounded-lg border p-3">
                    <p className="text-muted-foreground text-xs">Time</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Clock3 className="size-4 text-muted-foreground" />
                      <span className="text-sm">
                        {response ? `${response.timeMs} ms` : "-"}
                      </span>
                    </div>
                  </div>
                  <div className="border-input bg-muted/40 rounded-lg border p-3">
                    <p className="text-muted-foreground text-xs">Size</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Database className="size-4 text-muted-foreground" />
                      <span className="text-sm">
                        {response ? formatBytes(response.size) : "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {errorMessage && (
                  <Alert variant="destructive">
                    <AlertTitle>Request failed</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}

                {response ? (
                  <Tabs defaultValue="body" className="flex flex-1 flex-col gap-3">
                    <TabsList>
                      <TabsTrigger value="body">Body</TabsTrigger>
                      <TabsTrigger value="headers">Headers</TabsTrigger>
                    </TabsList>
                    <TabsContent
                      value="body"
                      className="flex-1 overflow-hidden rounded-lg border"
                    >
                      <pre className="bg-muted/40 h-full w-full overflow-auto p-4 text-sm">
                        {response.body}
                      </pre>
                    </TabsContent>
                    <TabsContent value="headers" className="flex-1 overflow-hidden">
                      <div className="bg-muted/40 divide-y rounded-lg border">
                        {response.headers.length === 0 ? (
                          <div className="text-muted-foreground p-4 text-sm">
                            Server returned no headers.
                          </div>
                        ) : (
                          response.headers.map((header) => (
                            <div
                              key={`${header.key}-${header.value}`}
                              className="flex items-center justify-between gap-4 px-4 py-2 text-sm"
                            >
                              <span className="font-medium">{header.key}</span>
                              <span className="text-muted-foreground break-all">
                                {header.value}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="border-dashed text-muted-foreground flex flex-1 items-center justify-center rounded-lg border text-sm">
                    Send a request to see the response.
                  </div>
                )}
              </CardContent>
            </Card>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  )
}
