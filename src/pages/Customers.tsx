import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { User, Mail, Building2, Phone, Calendar, RefreshCw } from 'lucide-react';
import { getAllCustomers, getCustomerCallHistory, Customer, CallRecord } from '@/services/customerService';
import { formatDistance } from 'date-fns';

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    const data = await getAllCustomers();
    setCustomers(data);
    setLoading(false);
  };

  const handleCustomerClick = async (customer: Customer) => {
    setSelectedCustomer(customer);
    const history = await getCustomerCallHistory(customer.id);
    setCallHistory(history);
    setDrawerOpen(true);
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-500/10 text-green-500';
      case 'negative': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Phone Numbers</h1>
          <p className="text-muted-foreground mt-1">
            Phone numbers with call history and records
          </p>
        </div>
        <Button onClick={loadCustomers} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading phone numbers...</div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No phone numbers with calls yet. Make some calls to start building your database!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers
            .filter(customer => customer.totalCalls > 0) // Only show phone numbers that have calls
            .filter(customer => !customer.phoneNumber?.includes("447349397671")) // Exclude specific phone number
            .map((customer) => (
            <Card
              key={customer.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCustomerClick(customer)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {customer.phoneNumber}
                    </CardTitle>
                    {customer.name && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {customer.name}
                    </p>
                    )}
                  </div>
                  <Badge variant="outline">
                    {customer.totalCalls} {customer.totalCalls === 1 ? 'call' : 'calls'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {customer.email && (
                  <div className="text-sm flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {customer.email}
                  </div>
                )}
                {customer.company && (
                  <div className="text-sm flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    {customer.company}
                  </div>
                )}
                {customer.lastCallDate && (
                  <div className="text-sm flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Last call: {formatDistance(customer.lastCallDate, new Date(), { addSuffix: true })}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Customer Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedCustomer && (
            <>
              <SheetHeader>
                <SheetTitle>Phone Number Details</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Customer Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">{selectedCustomer.name || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{selectedCustomer.phoneNumber}</p>
                      </div>
                      {selectedCustomer.email && (
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{selectedCustomer.email}</p>
                        </div>
                      )}
                      {selectedCustomer.company && (
                        <div>
                          <p className="text-sm text-muted-foreground">Company</p>
                          <p className="font-medium">{selectedCustomer.company}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-muted-foreground">Total Calls</p>
                        <p className="font-medium">{selectedCustomer.totalCalls}</p>
                      </div>
                      {selectedCustomer.lastCallDate && (
                        <div>
                          <p className="text-sm text-muted-foreground">Last Call</p>
                          <p className="font-medium">
                            {formatDistance(selectedCustomer.lastCallDate, new Date(), { addSuffix: true })}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Call History */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Call History</h3>
                  {callHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No call history available</p>
                  ) : (
                    <div className="space-y-3">
                      {callHistory.map((call) => (
                        <Card key={call.id}>
                          <CardContent className="pt-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                {call.date.toLocaleDateString()} at {call.date.toLocaleTimeString()}
                              </span>
                              <Badge variant="outline">{call.duration}s</Badge>
                            </div>
                            
                            <div className="flex gap-2">
                              <Badge variant="outline">{call.extractedData.intent}</Badge>
                              <Badge variant="outline" className={getSentimentColor(call.extractedData.sentiment)}>
                                {call.extractedData.sentiment}
                              </Badge>
                            </div>

                            <p className="text-sm">{call.extractedData.summary}</p>

                            {call.extractedData.keyPoints && call.extractedData.keyPoints.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold mb-1">Key Points:</p>
                                <ul className="text-xs list-disc list-inside space-y-1 text-muted-foreground">
                                  {call.extractedData.keyPoints.map((point, idx) => (
                                    <li key={idx}>{point}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {call.extractedData.actionItems && call.extractedData.actionItems.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold mb-1">Action Items:</p>
                                <ul className="text-xs list-disc list-inside space-y-1 text-muted-foreground">
                                  {call.extractedData.actionItems.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

