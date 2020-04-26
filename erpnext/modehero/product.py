import frappe
import json


@frappe.whitelist()
def get_products_of_category(category):
    return frappe.get_list('Item', filters={'item_group': category}, fields=['name', 'item_name'])