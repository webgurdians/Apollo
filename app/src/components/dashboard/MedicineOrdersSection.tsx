import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Loader2,
  Search,
  Plus,
  Trash2,
  PhoneCall,
  ShoppingBag,
  Truck,
  Check,
  UserPlus,
} from "lucide-react";

interface OrderItem {
  medicineName: string;
  quantity: number;
  price: number;
}

export default function MedicineOrdersSection() {
  const utils = trpc.useUtils();

  // Queries
  const { data: orders, isLoading: ordersLoading } = trpc.medicineOrders.list.useQuery();
  const { data: patients, isLoading: patientsLoading } = trpc.patients.list.useQuery();

  // Mutations
  const createOrder = trpc.medicineOrders.create.useMutation({
    onSuccess: () => {
      toast.success("Medicine order placed successfully!");
      utils.medicineOrders.list.invalidate();
      utils.billing.list.invalidate();
      utils.appointment.stats.invalidate();
      resetForm();
    },
    onError: (err) => {
      toast.error("Failed to place order: " + err.message);
    },
  });

  const updateDeliveryStatus = trpc.medicineOrders.updateDeliveryStatus.useMutation({
    onSuccess: () => {
      toast.success("Delivery status updated!");
      utils.medicineOrders.list.invalidate();
    },
    onError: (err) => {
      toast.error("Failed to update delivery status: " + err.message);
    },
  });

  const updatePaymentStatus = trpc.medicineOrders.updatePaymentStatus.useMutation({
    onSuccess: () => {
      toast.success("Payment status updated!");
      utils.medicineOrders.list.invalidate();
      utils.billing.list.invalidate();
      utils.appointment.stats.invalidate();
    },
    onError: (err) => {
      toast.error("Failed to update payment status: " + err.message);
    },
  });

  const registerPatient = trpc.patients.create.useMutation({
    onSuccess: (data) => {
      toast.success("Patient registered successfully!");
      utils.patients.list.invalidate();
      // Set the newly registered patient as selected
      setSelectedPatientId(data.patient.id.toString());
      setSearchText(data.patient.name);
      setShowRegisterDialog(false);
      resetRegisterForm();
    },
    onError: (err) => {
      toast.error("Failed to register patient: " + err.message);
    },
  });

  // State: Place Order Form
  const [searchPatientText, setSearchText] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [items, setItems] = useState<OrderItem[]>([{ medicineName: "", quantity: 1, price: 0 }]);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
  const [deliveryStatus, setDeliveryStatus] = useState<
    "placed" | "out_for_delivery" | "delivered" | "cancelled"
  >("placed");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "upi" | "online">("cash");

  // State: Patient Register Form & Dialog
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [regName, setRegName] = useState("");
  const [regAge, setRegAge] = useState("");
  const [regGender, setRegGender] = useState("");
  const [regPhone, setRegPhone] = useState("");

  // Search Filter: Medicine Orders list
  const [listSearch, setListSearch] = useState("");

  const resetForm = () => {
    setSearchText("");
    setSelectedPatientId("");
    setItems([{ medicineName: "", quantity: 1, price: 0 }]);
    setPaymentStatus("pending");
    setDeliveryStatus("placed");
    setPaymentMethod("cash");
  };

  const resetRegisterForm = () => {
    setRegName("");
    setRegAge("");
    setRegGender("");
    setRegPhone("");
  };

  const handleRegisterPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regAge.trim() || !regGender || !regPhone.trim()) {
      toast.error("All patient fields are required");
      return;
    }
    registerPatient.mutate({
      name: regName,
      age: parseInt(regAge),
      gender: regGender,
      phone: regPhone,
      concern: "Medicine Delivery Order (Phone Request)",
    });
  };

  const handleAddItem = () => {
    setItems([...items, { medicineName: "", quantity: 1, price: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, fields: Partial<OrderItem>) => {
    const updated = [...items];
    updated[index] = { ...updated[index], ...fields };
    setItems(updated);
  };

  const orderValue = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error("Please search and select a patient");
      return;
    }
    const validItems = items.filter((item) => item.medicineName.trim() !== "");
    if (validItems.length === 0) {
      toast.error("Please add at least one medicine item");
      return;
    }

    createOrder.mutate({
      patientId: parseInt(selectedPatientId),
      items: validItems,
      totalAmount: orderValue,
      paymentStatus,
      deliveryStatus,
      paymentMethod: paymentStatus === "paid" ? paymentMethod : undefined,
    });
  };

  // Filter matched patients for the selector autocomplete dropdown
  const matchedPatients = searchPatientText
    ? patients?.filter(
        (p) =>
          p.name.toLowerCase().includes(searchPatientText.toLowerCase()) ||
          p.phone.includes(searchPatientText)
      )
    : [];

  // Filter orders history
  const filteredOrders = orders?.filter(
    (o) =>
      o.patientName?.toLowerCase().includes(listSearch.toLowerCase()) ||
      o.patientPhone?.includes(listSearch)
  );

  return (
    <div className="grid lg:grid-cols-3 gap-6 items-start">
      {/* Column 1: Take Order Form */}
      <div className="lg:col-span-1 bg-white rounded-xl border shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-apollo-blue" />
            Place Phone Order
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Register or search for a patient to place a medicine home-delivery order
          </p>
        </div>

        <form onSubmit={handleSubmitOrder} className="space-y-4">
          {/* Patient Selection Dropdown */}
          <div className="space-y-2 relative">
            <Label className="text-xs font-semibold">Patient Search / Register</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Type name or phone number..."
                  value={searchPatientText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    if (selectedPatientId) setSelectedPatientId("");
                  }}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1 text-xs"
                onClick={() => setShowRegisterDialog(true)}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Register
              </Button>
            </div>

            {/* Suggestions list */}
            {searchPatientText && !selectedPatientId && matchedPatients && (
              <div className="absolute left-0 right-0 bg-white border shadow-lg rounded-md mt-1 max-h-48 overflow-y-auto z-50 divide-y">
                {patientsLoading ? (
                  <div className="p-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Searching...
                  </div>
                ) : matchedPatients.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    No patients found. Click "Register" to add.
                  </div>
                ) : (
                  matchedPatients.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 hover:bg-slate-50 cursor-pointer text-xs flex justify-between items-center"
                      onClick={() => {
                        setSelectedPatientId(p.id.toString());
                        setSearchText(`${p.name} (${p.phone})`);
                      }}
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{p.name}</span>
                        <span className="text-muted-foreground ml-1.5">{p.age}y / {p.gender}</span>
                      </div>
                      <span className="text-muted-foreground font-mono text-[10px]">{p.phone}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Medicines Checklist */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b pb-1">
              <Label className="text-xs font-bold text-slate-800">Medicines Ordered</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-7 text-xs border-dashed gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg relative group">
                  <div className="flex-1 space-y-1.5">
                    <Input
                      placeholder="Medicine Name"
                      value={item.medicineName}
                      onChange={(e) => handleUpdateItem(idx, { medicineName: e.target.value })}
                      required
                      className="h-8 text-xs bg-white"
                    />
                    <div className="flex gap-2">
                      <div className="w-20">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Qty</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItem(idx, { quantity: parseInt(e.target.value) || 1 })}
                          required
                          className="h-7 text-xs bg-white"
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-[9px] uppercase font-bold text-muted-foreground">Price (₹)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={(e) => handleUpdateItem(idx, { price: parseFloat(e.target.value) || 0 })}
                          required
                          className="h-7 text-xs bg-white"
                        />
                      </div>
                    </div>
                  </div>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(idx)}
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Payment & Delivery Status */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="payment-status" className="text-xs font-semibold">Payment Status</Label>
              <Select value={paymentStatus} onValueChange={(val: "pending" | "paid") => setPaymentStatus(val)}>
                <SelectTrigger id="payment-status" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">To Collect (Pending)</SelectItem>
                  <SelectItem value="paid">Pre-paid (Paid)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="delivery-status" className="text-xs font-semibold">Delivery Status</Label>
              <Select
                value={deliveryStatus}
                onValueChange={(val: "placed" | "out_for_delivery" | "delivered" | "cancelled") =>
                  setDeliveryStatus(val)
                }
              >
                <SelectTrigger id="delivery-status" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="placed">Placed</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Method Selector if Paid */}
          {paymentStatus === "paid" && (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="payment-method" className="text-xs font-semibold">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(val: "cash" | "upi" | "online") => setPaymentMethod(val)}>
                <SelectTrigger id="payment-method" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Value Display */}
          <div className="bg-slate-50 border rounded-lg p-3 flex justify-between items-center text-xs">
            <span className="font-medium text-slate-600">Total Order Value:</span>
            <span className="font-bold text-sm text-slate-800">₹{orderValue.toFixed(2)}</span>
          </div>

          <Button type="submit" className="w-full bg-apollo-blue hover:bg-apollo-blue/90" disabled={createOrder.isPending}>
            {createOrder.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Placing Order...
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4 mr-2" />
                Place Order
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Column 2: Order History */}
      <div className="lg:col-span-2 bg-white rounded-xl border shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-apollo-blue" />
              Delivery Order History
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Track delivery logs and update payment/delivery statuses
            </p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by patient name or phone..."
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {ordersLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-apollo-blue" />
              <p className="text-xs text-muted-foreground mt-2">Loading orders history...</p>
            </div>
          ) : filteredOrders?.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              No medicine orders found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="text-xs">Order ID</TableHead>
                  <TableHead className="text-xs">Patient Details</TableHead>
                  <TableHead className="text-xs">Items</TableHead>
                  <TableHead className="text-xs">Value</TableHead>
                  <TableHead className="text-xs">Payment</TableHead>
                  <TableHead className="text-xs">Delivery Status</TableHead>
                  <TableHead className="text-xs">Date Placed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders?.map((order) => {
                  let orderItems: OrderItem[] = [];
                  try {
                    orderItems = JSON.parse(order.items);
                  } catch (e) {}

                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-semibold text-xs">#ORD-{order.id}</TableCell>
                      <TableCell>
                        <div className="font-semibold text-xs text-slate-800">{order.patientName}</div>
                        <div className="text-[10px] text-muted-foreground">{order.patientPhone}</div>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate text-[11px] text-slate-700">
                        {orderItems.map((it) => `${it.medicineName} (x${it.quantity})`).join(", ")}
                      </TableCell>
                      <TableCell className="font-bold text-xs">₹{order.totalAmount}</TableCell>
                      <TableCell>
                        <Select
                          value={order.paymentStatus}
                          onValueChange={(val: "pending" | "paid") =>
                            updatePaymentStatus.mutate({ id: order.id, paymentStatus: val, paymentMethod: "cash" })
                          }
                        >
                          <SelectTrigger className={`h-7 w-24 text-[10px] font-semibold rounded-full px-2 py-0 ${
                            order.paymentStatus === "paid" ? "bg-green-100 text-green-700 hover:bg-green-100" : "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={order.deliveryStatus}
                          onValueChange={(val: "placed" | "out_for_delivery" | "delivered" | "cancelled") =>
                            updateDeliveryStatus.mutate({ id: order.id, deliveryStatus: val })
                          }
                        >
                          <SelectTrigger className={`h-7 w-32 text-[10px] font-semibold ${
                            order.deliveryStatus === "delivered" ? "bg-emerald-100 text-emerald-700" :
                            order.deliveryStatus === "out_for_delivery" ? "bg-blue-100 text-blue-700" :
                            order.deliveryStatus === "cancelled" ? "bg-red-100 text-red-700" :
                            "bg-slate-100 text-slate-700"
                          }`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="placed">Placed</SelectItem>
                            <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {order.createdAt ? format(new Date(order.createdAt), "dd MMM yyyy, hh:mm a") : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Patient Register Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-1 text-sm font-bold">
              <UserPlus className="w-5 h-5 text-apollo-blue" />
              Register New Patient
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRegisterPatient} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="reg-name" className="text-xs font-semibold">Patient Name</Label>
                <Input
                  id="reg-name"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-phone" className="text-xs font-semibold">Mobile Number</Label>
                <Input
                  id="reg-phone"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="10-digit phone"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="reg-age" className="text-xs font-semibold">Age</Label>
                <Input
                  id="reg-age"
                  type="number"
                  value={regAge}
                  onChange={(e) => setRegAge(e.target.value)}
                  placeholder="Age in years"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reg-gender" className="text-xs font-semibold">Gender</Label>
                <Select value={regGender} onValueChange={setRegGender}>
                  <SelectTrigger id="reg-gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={() => setShowRegisterDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-apollo-blue hover:bg-apollo-blue/90" disabled={registerPatient.isPending}>
                {registerPatient.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1.5" />
                    Register Patient
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
