'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
    Download,
    File,
    FileText,
    Table
} from 'lucide-react';
import { useState } from 'react';

interface ExportMedicalRecordProps {
  recordId: string;
  onClose: () => void;
}

interface ExportOptions {
  format: 'pdf' | 'excel' | 'json';
  includeAttachments: boolean;
  includeDentalChart: boolean;
  includeProcedures: boolean;
  includeNotes: boolean;
}

export default function ExportMedicalRecord({ recordId, onClose }: ExportMedicalRecordProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    includeAttachments: true,
    includeDentalChart: true,
    includeProcedures: true,
    includeNotes: true
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/medical-records/${recordId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(exportOptions)
      });

      if (response.ok) {
        const data = await response.json();
        
        // Tạo file download
        const blob = new Blob([JSON.stringify(data.data, null, 2)], {
          type: 'application/json'
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medical-record-${recordId}.${exportOptions.format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Thành công",
          description: "Hồ sơ bệnh án đã được xuất thành công",
        });
        onClose();
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể xuất hồ sơ bệnh án",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <File className="h-4 w-4" />;
      case 'excel':
        return <Table className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Xuất hồ sơ bệnh án
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Format Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Định dạng xuất</label>
          <Select
            value={exportOptions.format}
            onValueChange={(value: 'pdf' | 'excel' | 'json') => 
              setExportOptions(prev => ({ ...prev, format: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pdf">
                <div className="flex items-center gap-2">
                  {getFormatIcon('pdf')}
                  PDF Document
                </div>
              </SelectItem>
              <SelectItem value="excel">
                <div className="flex items-center gap-2">
                  {getFormatIcon('excel')}
                  Excel Spreadsheet
                </div>
              </SelectItem>
              <SelectItem value="json">
                <div className="flex items-center gap-2">
                  {getFormatIcon('json')}
                  JSON Data
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Export Options */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Tùy chọn xuất</label>
          
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeAttachments"
              checked={exportOptions.includeAttachments}
              onCheckedChange={(checked) => 
                setExportOptions(prev => ({ ...prev, includeAttachments: checked as boolean }))
              }
            />
            <label htmlFor="includeAttachments" className="text-sm">
              Bao gồm tệp đính kèm
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeDentalChart"
              checked={exportOptions.includeDentalChart}
              onCheckedChange={(checked) => 
                setExportOptions(prev => ({ ...prev, includeDentalChart: checked as boolean }))
              }
            />
            <label htmlFor="includeDentalChart" className="text-sm">
              Bao gồm sơ đồ răng
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeProcedures"
              checked={exportOptions.includeProcedures}
              onCheckedChange={(checked) => 
                setExportOptions(prev => ({ ...prev, includeProcedures: checked as boolean }))
              }
            />
            <label htmlFor="includeProcedures" className="text-sm">
              Bao gồm thủ thuật
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeNotes"
              checked={exportOptions.includeNotes}
              onCheckedChange={(checked) => 
                setExportOptions(prev => ({ ...prev, includeNotes: checked as boolean }))
              }
            />
            <label htmlFor="includeNotes" className="text-sm">
              Bao gồm ghi chú
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleExport}
            disabled={loading}
            className="flex-1"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Xuất
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Hủy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
