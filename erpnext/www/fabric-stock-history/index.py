from __future__ import unicode_literals
import frappe
from frappe import _
import frappe.www.list
import datetime
from erpnext.modehero.user import haveAccess

no_cache = 1


def get_context(context):
    module = 'stock'
    if(not haveAccess(module)):
        frappe.throw(_("You have not subscribed to this service"),
                     frappe.PermissionError)
    params = frappe.form_dict
    if('stock' in params):
        context.stock = frappe.get_doc('Stock', params.stock)

    context.product = frappe.get_doc("Fabric", context.stock.internal_ref)
    context.stock=frappe.get_doc('Stock',params.stock)

    context.historyList = frappe.get_all("Stock History", fields=[
                                         "in_out,name,creation,quantity,linked_order,order_type"], filters={"parent": context.stock.name})

    

    return context
