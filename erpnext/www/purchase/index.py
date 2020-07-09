from __future__ import unicode_literals
import frappe
from frappe import _
import frappe.www.list
import datetime

no_cache = 1


def get_context(context):

    brand = frappe.get_doc('User', frappe.session.user).brand_name
    orders = frappe.get_list('Sales Order', filters={'company': brand}, fields=['name', 'customer'])
    
    context.order_items = {}
    for o in orders:
        context.order_items[o.name] = frappe.get_list('Sales Order Item',filters={'parent':o.name,'docstatus':0},fields=['name','item_code','parent'])
    
    context.unique_items_orders = get_unique_items_orders(context.order_items)
    return context

## returns unique item objects
def get_unique_items_orders(order_items):
    temp_codes = []
    temp_objects = {}
    for order in order_items:
        for item in order_items[order]: 
            if item.item_code in temp_codes:
                temp_objects[item.item_code].append(item)
                continue
            temp_codes.append(item.item_code)
            temp_objects[item.item_code] = []
            temp_objects[item.item_code].append(item)
    return temp_objects