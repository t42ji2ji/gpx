import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { motion } from "framer-motion"
import { useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Upload, Map, Settings } from "lucide-react"
import { useGpxParser } from "@/hooks/useGpxParser"

const Home = () => {
    const navigate = useNavigate()
    const { parseFile, parsedGpx, isLoading, error } = useGpxParser()

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            await parseFile(file)
        }
    }, [parseFile])

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files?.[0]
        if (file && file.name.endsWith('.gpx')) {
            await parseFile(file)
        }
    }, [parseFile])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
    }, [])

    if (parsedGpx) {
        navigate('/editor', { state: { gpx: parsedGpx } })
    }

    const features = [
        { icon: Map, title: '路線視覺化', desc: '在精美地圖上展示您的 GPX 路線' },
     
        { icon: Settings, title: '自訂樣式', desc: '調整地圖、路線和覆蓋元素' },
    ]

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <div className="flex flex-col items-center justify-center p-4 flex-grow">
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center max-w-2xl mx-auto"
                >
                    <h1 className="text-5xl sm:text-6xl font-bold mb-4 text-foreground">
                        GPX Route Video
                    </h1>
                    <p className="text-xl text-muted-foreground mb-8">
                        上傳您的 GPX 文件，製作精美的路線動畫影片
                    </p>

                    {/* Upload Area */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card 
                            className="border-2 border-dashed hover:border-primary transition-colors cursor-pointer"
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                        >
                            <CardContent className="py-12">
                                <label className="cursor-pointer block">
                                    <input
                                        type="file"
                                        accept=".gpx"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        disabled={isLoading}
                                    />
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Upload className="w-8 h-8 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-medium">
                                                {isLoading ? '解析中...' : '點擊或拖放 GPX 文件'}
                                            </p>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                支援標準 GPX 格式
                                            </p>
                                        </div>
                                        {error && (
                                            <p className="text-sm text-destructive">{error}</p>
                                        )}
                                    </div>
                                </label>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Features */}
                    <motion.div 
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        {features.map((feature, i) => (
                            <Card key={i} className="text-left">
                                <CardContent className="pt-6">
                                    <feature.icon className="w-8 h-8 text-primary mb-3" />
                                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </motion.div>

                    {/* Direct to Editor */}
                    <motion.div
                        className="mt-8"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                    >
                        <Button variant="outline" onClick={() => navigate('/editor')}>
                            直接進入編輯器
                        </Button>
                    </motion.div>
                </motion.div>
            </div>

            <footer className="container mx-auto py-8 px-4 border-t">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <p className="text-muted-foreground">GPX Route Video Generator</p>
                    <div className="flex gap-4 mt-4 md:mt-0">
                        <Button variant="ghost" size="sm" asChild>
                            <a href="https://www.threads.net/@dorara_hsieh" target="_blank" rel="noopener noreferrer">
                                @dorara_hsieh
                            </a>
                        </Button>
                    </div>
                </div>
            </footer>
        </div>
    )
}

export default Home 