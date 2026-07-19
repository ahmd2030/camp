"use server";

import { addInvoice, InvoiceData } from "@/services/invoices";

export async function createInvoice(data: {
  clientId?: string;
  clientName?: string;
  taskId?: string;
  amount: number;
  description: string;
}) {
  try {
    const newInvoice: InvoiceData = {
      clientId: data.clientId,
      clientName: data.clientName || 'غير محدد',
      taskId: data.taskId,
      amount: data.amount,
      description: data.description,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await addInvoice(newInvoice);

    if (result.success) {
      return { success: true, id: result.id };
    } else {
      throw new Error("Failed to create invoice");
    }
  } catch (error: any) {
    console.error("Error in createInvoice server action:", error);
    return { success: false, error: error.message };
  }
}
