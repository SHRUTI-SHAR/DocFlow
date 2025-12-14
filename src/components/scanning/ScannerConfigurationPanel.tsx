import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
  Scan,
  Settings,
  Wifi,
  Usb,
  Monitor,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Printer,
  Zap,
  HardDrive,
  Network,
  AlertTriangle
} from 'lucide-react';

export interface ScannerDevice {
  id: string;
  name: string;
  manufacturer: string;
  model: string;
  connectionType: 'usb' | 'network' | 'wireless';
  status: 'online' | 'offline' | 'busy' | 'error';
  capabilities: {
    maxResolution: number;
    colorModes: ('color' | 'grayscale' | 'blackwhite')[];
    paperSizes: string[];
    duplex: boolean;
    adf: boolean;
    adfCapacity?: number;
  };
  ipAddress?: string;
  lastSeen?: Date;
}

export interface ScanSettings {
  resolution: number;
  colorMode: 'color' | 'grayscale' | 'blackwhite';
  paperSize: string;
  duplex: boolean;
  brightness: number;
  contrast: number;
  autoRotate: boolean;
  autoCrop: boolean;
  blankPageRemoval: boolean;
  deskew: boolean;
  outputFormat: 'pdf' | 'tiff' | 'jpeg' | 'png';
  compression: 'none' | 'lzw' | 'jpeg';
  multiPagePdf: boolean;
}

interface ScannerConfigurationPanelProps {
  onScannerSelect?: (scanner: ScannerDevice) => void;
  onSettingsChange?: (settings: ScanSettings) => void;
  selectedScanner?: ScannerDevice | null;
  currentSettings?: ScanSettings;
}

const defaultSettings: ScanSettings = {
  resolution: 300,
  colorMode: 'color',
  paperSize: 'A4',
  duplex: false,
  brightness: 0,
  contrast: 0,
  autoRotate: true,
  autoCrop: true,
  blankPageRemoval: true,
  deskew: true,
  outputFormat: 'pdf',
  compression: 'jpeg',
  multiPagePdf: true
};

// Simulated scanner discovery
const mockScanners: ScannerDevice[] = [
  {
    id: 'scanner-1',
    name: 'HP ScanJet Pro 3000',
    manufacturer: 'HP',
    model: 'ScanJet Pro 3000 s4',
    connectionType: 'usb',
    status: 'online',
    capabilities: {
      maxResolution: 1200,
      colorModes: ['color', 'grayscale', 'blackwhite'],
      paperSizes: ['A4', 'A5', 'Letter', 'Legal', 'Custom'],
      duplex: true,
      adf: true,
      adfCapacity: 50
    }
  },
  {
    id: 'scanner-2',
    name: 'Canon imageFORMULA DR-C225',
    manufacturer: 'Canon',
    model: 'imageFORMULA DR-C225 II',
    connectionType: 'network',
    status: 'online',
    ipAddress: '192.168.1.105',
    capabilities: {
      maxResolution: 600,
      colorModes: ['color', 'grayscale', 'blackwhite'],
      paperSizes: ['A4', 'A5', 'A6', 'Letter', 'Legal', 'Business Card'],
      duplex: true,
      adf: true,
      adfCapacity: 30
    }
  },
  {
    id: 'scanner-3',
    name: 'Epson WorkForce ES-580W',
    manufacturer: 'Epson',
    model: 'WorkForce ES-580W',
    connectionType: 'wireless',
    status: 'offline',
    capabilities: {
      maxResolution: 600,
      colorModes: ['color', 'grayscale', 'blackwhite'],
      paperSizes: ['A4', 'A5', 'Letter', 'Legal'],
      duplex: true,
      adf: true,
      adfCapacity: 100
    }
  }
];

export const ScannerConfigurationPanel: React.FC<ScannerConfigurationPanelProps> = ({
  onScannerSelect,
  onSettingsChange,
  selectedScanner,
  currentSettings = defaultSettings
}) => {
  const [scanners, setScanners] = useState<ScannerDevice[]>(mockScanners);
  const [isScanning, setIsScanning] = useState(false);
  const [settings, setSettings] = useState<ScanSettings>(currentSettings);
  const [networkScannerIp, setNetworkScannerIp] = useState('');
  const [isAddingNetwork, setIsAddingNetwork] = useState(false);

  const handleRefreshScanners = async () => {
    setIsScanning(true);
    // Simulate scanner discovery
    await new Promise(resolve => setTimeout(resolve, 2000));
    setScanners(mockScanners);
    setIsScanning(false);
    toast.success('Scanner discovery complete', {
      description: `Found ${mockScanners.length} scanner(s)`
    });
  };

  const handleAddNetworkScanner = async () => {
    if (!networkScannerIp.trim()) {
      toast.error('Please enter a valid IP address');
      return;
    }

    setIsAddingNetwork(true);
    // Simulate network scanner connection
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newScanner: ScannerDevice = {
      id: `network-${Date.now()}`,
      name: `Network Scanner (${networkScannerIp})`,
      manufacturer: 'Unknown',
      model: 'Network Scanner',
      connectionType: 'network',
      status: 'online',
      ipAddress: networkScannerIp,
      capabilities: {
        maxResolution: 600,
        colorModes: ['color', 'grayscale', 'blackwhite'],
        paperSizes: ['A4', 'Letter'],
        duplex: false,
        adf: false
      }
    };

    setScanners(prev => [...prev, newScanner]);
    setNetworkScannerIp('');
    setIsAddingNetwork(false);
    toast.success('Network scanner added successfully');
  };

  const handleSettingChange = <K extends keyof ScanSettings>(key: K, value: ScanSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const getConnectionIcon = (type: ScannerDevice['connectionType']) => {
    switch (type) {
      case 'usb': return <Usb className="h-4 w-4" />;
      case 'network': return <Network className="h-4 w-4" />;
      case 'wireless': return <Wifi className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: ScannerDevice['status']) => {
    switch (status) {
      case 'online':
        return <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20"><CheckCircle2 className="h-3 w-3 mr-1" /> Online</Badge>;
      case 'offline':
        return <Badge variant="secondary" className="bg-muted"><XCircle className="h-3 w-3 mr-1" /> Offline</Badge>;
      case 'busy':
        return <Badge variant="default" className="bg-amber-500/10 text-amber-500 border-amber-500/20"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Busy</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Error</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="scanners" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scanners" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Scanners
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Scan Settings
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scanners" className="space-y-4 mt-4">
          {/* Scanner Discovery */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Scan className="h-5 w-5 text-primary" />
                    Available Scanners
                  </CardTitle>
                  <CardDescription>
                    Discover and connect to local or network scanners
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshScanners}
                  disabled={isScanning}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
                  {isScanning ? 'Scanning...' : 'Refresh'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {scanners.map((scanner) => (
                <div
                  key={scanner.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${
                    selectedScanner?.id === scanner.id 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
                      : 'border-border'
                  } ${scanner.status !== 'online' ? 'opacity-60' : ''}`}
                  onClick={() => scanner.status === 'online' && onScannerSelect?.(scanner)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Monitor className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          {scanner.name}
                          {selectedScanner?.id === scanner.id && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {scanner.manufacturer} • {scanner.model}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {getConnectionIcon(scanner.connectionType)}
                            {scanner.connectionType.charAt(0).toUpperCase() + scanner.connectionType.slice(1)}
                          </span>
                          {scanner.ipAddress && (
                            <span>IP: {scanner.ipAddress}</span>
                          )}
                          {scanner.capabilities.adf && (
                            <span className="flex items-center gap-1">
                              <HardDrive className="h-3 w-3" />
                              ADF ({scanner.capabilities.adfCapacity} sheets)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(scanner.status)}
                      <span className="text-xs text-muted-foreground">
                        Max {scanner.capabilities.maxResolution} DPI
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {scanners.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Scan className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No scanners found</p>
                  <p className="text-sm">Click refresh to discover scanners</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Network Scanner */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="h-5 w-5 text-primary" />
                Add Network Scanner
              </CardTitle>
              <CardDescription>
                Manually add a scanner by IP address
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Input
                  placeholder="Enter scanner IP address (e.g., 192.168.1.100)"
                  value={networkScannerIp}
                  onChange={(e) => setNetworkScannerIp(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={handleAddNetworkScanner}
                  disabled={isAddingNetwork || !networkScannerIp.trim()}
                >
                  {isAddingNetwork ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Add Scanner'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Scan Quality</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resolution */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Resolution (DPI)</Label>
                  <span className="text-sm font-medium">{settings.resolution} DPI</span>
                </div>
                <Slider
                  value={[settings.resolution]}
                  onValueChange={([value]) => handleSettingChange('resolution', value)}
                  min={75}
                  max={1200}
                  step={75}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Draft (75)</span>
                  <span>Standard (300)</span>
                  <span>High (600)</span>
                  <span>Max (1200)</span>
                </div>
              </div>

              {/* Color Mode */}
              <div className="space-y-2">
                <Label>Color Mode</Label>
                <Select
                  value={settings.colorMode}
                  onValueChange={(value: ScanSettings['colorMode']) => handleSettingChange('colorMode', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="color">Full Color (24-bit)</SelectItem>
                    <SelectItem value="grayscale">Grayscale (8-bit)</SelectItem>
                    <SelectItem value="blackwhite">Black & White (1-bit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Paper Size */}
              <div className="space-y-2">
                <Label>Paper Size</Label>
                <Select
                  value={settings.paperSize}
                  onValueChange={(value) => handleSettingChange('paperSize', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                    <SelectItem value="A5">A5 (148 × 210 mm)</SelectItem>
                    <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
                    <SelectItem value="Legal">Legal (8.5 × 14 in)</SelectItem>
                    <SelectItem value="Auto">Auto Detect</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Brightness & Contrast */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Brightness</Label>
                    <span className="text-sm">{settings.brightness > 0 ? '+' : ''}{settings.brightness}</span>
                  </div>
                  <Slider
                    value={[settings.brightness]}
                    onValueChange={([value]) => handleSettingChange('brightness', value)}
                    min={-50}
                    max={50}
                    step={5}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Contrast</Label>
                    <span className="text-sm">{settings.contrast > 0 ? '+' : ''}{settings.contrast}</span>
                  </div>
                  <Slider
                    value={[settings.contrast]}
                    onValueChange={([value]) => handleSettingChange('contrast', value)}
                    min={-50}
                    max={50}
                    step={5}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Output Format</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>File Format</Label>
                <Select
                  value={settings.outputFormat}
                  onValueChange={(value: ScanSettings['outputFormat']) => handleSettingChange('outputFormat', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Document</SelectItem>
                    <SelectItem value="tiff">TIFF Image</SelectItem>
                    <SelectItem value="jpeg">JPEG Image</SelectItem>
                    <SelectItem value="png">PNG Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {settings.outputFormat === 'pdf' && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Multi-page PDF</Label>
                    <p className="text-xs text-muted-foreground">Combine all pages into one PDF</p>
                  </div>
                  <Switch
                    checked={settings.multiPagePdf}
                    onCheckedChange={(checked) => handleSettingChange('multiPagePdf', checked)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Compression</Label>
                <Select
                  value={settings.compression}
                  onValueChange={(value: ScanSettings['compression']) => handleSettingChange('compression', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Largest file size)</SelectItem>
                    <SelectItem value="lzw">LZW (Lossless)</SelectItem>
                    <SelectItem value="jpeg">JPEG (Smallest file size)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Scanning Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Duplex Scanning</Label>
                  <p className="text-xs text-muted-foreground">Scan both sides of the page</p>
                </div>
                <Switch
                  checked={settings.duplex}
                  onCheckedChange={(checked) => handleSettingChange('duplex', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Rotate</Label>
                  <p className="text-xs text-muted-foreground">Automatically correct page orientation</p>
                </div>
                <Switch
                  checked={settings.autoRotate}
                  onCheckedChange={(checked) => handleSettingChange('autoRotate', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Crop</Label>
                  <p className="text-xs text-muted-foreground">Automatically detect and crop page borders</p>
                </div>
                <Switch
                  checked={settings.autoCrop}
                  onCheckedChange={(checked) => handleSettingChange('autoCrop', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Deskew</Label>
                  <p className="text-xs text-muted-foreground">Straighten tilted pages automatically</p>
                </div>
                <Switch
                  checked={settings.deskew}
                  onCheckedChange={(checked) => handleSettingChange('deskew', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Blank Page Removal</Label>
                  <p className="text-xs text-muted-foreground">Automatically remove blank pages</p>
                </div>
                <Switch
                  checked={settings.blankPageRemoval}
                  onCheckedChange={(checked) => handleSettingChange('blankPageRemoval', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quick Presets */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Presets</CardTitle>
              <CardDescription>Apply common scanning configurations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col"
                  onClick={() => {
                    const preset: ScanSettings = {
                      ...defaultSettings,
                      resolution: 150,
                      colorMode: 'grayscale',
                      compression: 'jpeg'
                    };
                    setSettings(preset);
                    onSettingsChange?.(preset);
                    toast.success('Applied "Quick Scan" preset');
                  }}
                >
                  <Zap className="h-5 w-5 mb-1" />
                  <span className="text-sm font-medium">Quick Scan</span>
                  <span className="text-xs text-muted-foreground">150 DPI, Grayscale</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col"
                  onClick={() => {
                    const preset: ScanSettings = {
                      ...defaultSettings,
                      resolution: 300,
                      colorMode: 'color',
                      compression: 'jpeg'
                    };
                    setSettings(preset);
                    onSettingsChange?.(preset);
                    toast.success('Applied "Document" preset');
                  }}
                >
                  <HardDrive className="h-5 w-5 mb-1" />
                  <span className="text-sm font-medium">Document</span>
                  <span className="text-xs text-muted-foreground">300 DPI, Color</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col"
                  onClick={() => {
                    const preset: ScanSettings = {
                      ...defaultSettings,
                      resolution: 600,
                      colorMode: 'color',
                      compression: 'lzw'
                    };
                    setSettings(preset);
                    onSettingsChange?.(preset);
                    toast.success('Applied "Photo" preset');
                  }}
                >
                  <Monitor className="h-5 w-5 mb-1" />
                  <span className="text-sm font-medium">Photo</span>
                  <span className="text-xs text-muted-foreground">600 DPI, Lossless</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col"
                  onClick={() => {
                    const preset: ScanSettings = {
                      ...defaultSettings,
                      resolution: 1200,
                      colorMode: 'color',
                      compression: 'none'
                    };
                    setSettings(preset);
                    onSettingsChange?.(preset);
                    toast.success('Applied "Archive" preset');
                  }}
                >
                  <HardDrive className="h-5 w-5 mb-1" />
                  <span className="text-sm font-medium">Archive</span>
                  <span className="text-xs text-muted-foreground">1200 DPI, No compression</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ScannerConfigurationPanel;
