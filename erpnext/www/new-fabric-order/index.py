from __future__ import unicode_literals
import frappe
from frappe import _
import frappe.www.list
import datetime

no_cache = 1


def get_context(context):
    brand = frappe.get_doc("User", frappe.session.user).brand_name

    context.product_names = frappe.get_list(
        'Item', filters={'brand': brand}, fields=['item_name','item_code' ])
        
    context.fabric_refs = frappe.get_list(
        'Fabric', filters={'brand': brand}, fields=['fabric_ref'])

    context.production_facories = frappe.get_list(
        'Production Factory', filters={'brand': brand}, fields=['name'])

    context.fab_suppliers=frappe.get_list('Supplier',filters={'supplier_group':'Fabric','brand':brand},fields=['name'])

    # context.parents = [
    #     {"name": frappe._("Home"), "route": "/"},
    # ]

    return context
