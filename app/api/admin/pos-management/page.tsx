'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, RefreshCw, Settings, MapPin } from 'lucide-react';
import useSWR from 'swr';

interface AdminTable {
  id: string;
  zoneId: string;
  tableNumber: number;
  displayName: string;
  maxPax: number;
  position: { x: number; y: number };
  isActive: boolean;
  zone: {
    id: string;
    name: string;
    displayName: string;
    zoneType: string;
    colorTheme: string;
  };
  currentStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Zone {
  id: string;
  name: string;
  displayName: string;
  zoneType: string;
  colorTheme: string;
  isActive: boolean;
  displayOrder: number;
}

interface AdminTablesResponse {
  tables: AdminTable[];
  zones: Zone[];
  summary: {
    totalTables: number;
    totalZones: number;
    activeTables: number;
    activeZones: number;
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch admin tables data');
  return res.json();
};

export default function POSManagementPage() {
  const { data, error, isLoading, mutate } = useSWR<AdminTablesResponse>(
    '/api/admin/pos/tables',
    fetcher,
    {
      refreshInterval: 10000,
      revalidateOnFocus: true
    }
  );

  const [selectedTable, setSelectedTable] = useState<AdminTable | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    zoneId: '',
    tableNumber: '',
    displayName: '',
    maxPax: '',
    positionX: '',
    positionY: ''
  });

  const resetForm = () => {
    setFormData({
      zoneId: '',
      tableNumber: '',
      displayName: '',
      maxPax: '',
      positionX: '',
      positionY: ''
    });
  };

  const handleCreateTable = async () => {
    try {
      const response = await fetch('/api/admin/pos/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create table');
      }

      const result = await response.json();
      mutate(); // Refresh data
      setIsCreateModalOpen(false);
      resetForm();
      alert(result.message || 'Table created successfully');
    } catch (error) {
      console.error('Error creating table:', error);
      alert(error instanceof Error ? error.message : 'Failed to create table');
    }
  };

  const handleEditTable = async () => {
    if (!selectedTable) return;

    try {
      const response = await fetch(`/api/admin/pos/tables/${selectedTable.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: formData.displayName,
          maxPax: parseInt(formData.maxPax),
          positionX: parseInt(formData.positionX),
          positionY: parseInt(formData.positionY),
          isActive: selectedTable.isActive
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update table');
      }

      const result = await response.json();
      mutate(); // Refresh data
      setIsEditModalOpen(false);
      setSelectedTable(null);
      resetForm();
      alert(result.message || 'Table updated successfully');
    } catch (error) {
      console.error('Error updating table:', error);
      alert(error instanceof Error ? error.message : 'Failed to update table');
    }
  };

  const handleDeleteTable = async () => {
    if (!selectedTable) return;

    try {
      const response = await fetch(`/api/admin/pos/tables/${selectedTable.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete table');
      }

      const result = await response.json();
      mutate(); // Refresh data
      setIsDeleteModalOpen(false);
      setSelectedTable(null);
      alert(result.message || 'Table deleted successfully');
    } catch (error) {
      console.error('Error deleting table:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete table');
    }
  };

  const openEditModal = (table: AdminTable) => {
    setSelectedTable(table);
    setFormData({
      zoneId: table.zoneId,
      tableNumber: table.tableNumber.toString(),
      displayName: table.displayName,
      maxPax: table.maxPax.toString(),
      positionX: table.position.x.toString(),
      positionY: table.position.y.toString()
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (table: AdminTable) => {
    setSelectedTable(table);
    setIsDeleteModalOpen(true);
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading POS management data: {error.message}</p>
            <Button onClick={() => mutate()} className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Settings className="w-6 h-6" />
                POS Table Management
              </CardTitle>
              <p className="text-gray-600 mt-1">
                Configure tables, zones, and layout for the POS system
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => mutate()}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Table
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{data.summary.totalTables}</div>
                <div className="text-sm text-gray-600">Total Tables</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{data.summary.activeTables}</div>
                <div className="text-sm text-gray-600">Active Tables</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{data.summary.totalZones}</div>
                <div className="text-sm text-gray-600">Total Zones</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{data.summary.activeZones}</div>
                <div className="text-sm text-gray-600">Active Zones</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tables by Zone */}
      {data?.zones.map(zone => {
        const zoneTables = data.tables.filter(table => table.zoneId === zone.id);
        
        return (
          <Card key={zone.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: zone.colorTheme }}
                />
                <CardTitle className="text-xl">{zone.displayName}</CardTitle>
                <Badge variant="outline">
                  {zoneTables.length} tables
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              {zoneTables.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No tables in this zone
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {zoneTables
                    .sort((a, b) => a.tableNumber - b.tableNumber)
                    .map(table => (
                      <Card key={table.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold">{table.displayName}</h3>
                              <Badge 
                                variant={table.isActive ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {table.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            
                            <div className="text-sm space-y-1">
                              <div>Max Pax: {table.maxPax}</div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                Position: ({table.position.x}, {table.position.y})
                              </div>
                              <div>Status: 
                                <Badge 
                                  variant={table.currentStatus === 'occupied' ? "destructive" : "secondary"}
                                  className="ml-1 text-xs"
                                >
                                  {table.currentStatus}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => openEditModal(table)}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteModal(table)}
                                disabled={table.currentStatus === 'occupied'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  }
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Create Table Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Table</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Zone</Label>
              <Select value={formData.zoneId} onValueChange={(value) => setFormData({...formData, zoneId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select zone" />
                </SelectTrigger>
                <SelectContent>
                  {data?.zones.map(zone => (
                    <SelectItem key={zone.id} value={zone.id}>
                      {zone.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Table Number</Label>
                <Input
                  type="number"
                  value={formData.tableNumber}
                  onChange={(e) => setFormData({...formData, tableNumber: e.target.value})}
                  placeholder="1"
                />
              </div>
              <div>
                <Label>Max Pax</Label>
                <Input
                  type="number"
                  value={formData.maxPax}
                  onChange={(e) => setFormData({...formData, maxPax: e.target.value})}
                  placeholder="8"
                />
              </div>
            </div>
            
            <div>
              <Label>Display Name</Label>
              <Input
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                placeholder="Bar 1"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Position X</Label>
                <Input
                  type="number"
                  value={formData.positionX}
                  onChange={(e) => setFormData({...formData, positionX: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Position Y</Label>
                <Input
                  type="number"
                  value={formData.positionY}
                  onChange={(e) => setFormData({...formData, positionY: e.target.value})}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {setIsCreateModalOpen(false); resetForm();}}>
              Cancel
            </Button>
            <Button onClick={handleCreateTable}>
              Create Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Table Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Table: {selectedTable?.displayName}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Display Name</Label>
              <Input
                value={formData.displayName}
                onChange={(e) => setFormData({...formData, displayName: e.target.value})}
              />
            </div>
            
            <div>
              <Label>Max Pax</Label>
              <Input
                type="number"
                value={formData.maxPax}
                onChange={(e) => setFormData({...formData, maxPax: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Position X</Label>
                <Input
                  type="number"
                  value={formData.positionX}
                  onChange={(e) => setFormData({...formData, positionX: e.target.value})}
                />
              </div>
              <div>
                <Label>Position Y</Label>
                <Input
                  type="number"
                  value={formData.positionY}
                  onChange={(e) => setFormData({...formData, positionY: e.target.value})}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {setIsEditModalOpen(false); setSelectedTable(null); resetForm();}}>
              Cancel
            </Button>
            <Button onClick={handleEditTable}>
              Update Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Table</DialogTitle>
          </DialogHeader>
          
          <p>Are you sure you want to delete <strong>{selectedTable?.displayName}</strong>? This action cannot be undone.</p>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {setIsDeleteModalOpen(false); setSelectedTable(null);}}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTable}>
              Delete Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}