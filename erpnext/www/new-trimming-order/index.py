from __future__ import unicode_literals
import frappe
from frappe import _
import frappe.www.list
import datetime

no_cache = 1


def get_context(context):
    context.brand = frappe.get_doc("User", frappe.session.user).brand_name

    context.product_names = frappe.get_list(
        'Item', filters={'brand': context.brand}, fields=['item_name','item_code' ])
        
    context.trimming_items = frappe.get_list(
        'Trimming Item', filters={'brand': context.brand}, fields=['name'])

    context.production_facories = frappe.get_list(
        'Production Factory', filters={'brand': context.brand}, fields=['name',"factory_name"])

    return context
