import frappe
import json
import ast


@frappe.whitelist()
def create_supplier(data):
    data = json.loads(data)
    user = frappe.get_doc('User', frappe.session.user)
    brand = user.brand_name
    supplier = frappe.get_doc({
        'doctype': 'Supplier',
        'brand' : brand,
        'email' : data['email'],
        'supplier_group' : data['supplier_group'],
        'address1' : data['address1'],
        'address2' : data['address2'],
        'contact' : data['contact'],
        'phone_number' : data['phone_number'],
        'city' : data['city'],
        'zip_code' : data['zip_code'],
        'supplier_name' : data['supplier_name']
    })
    supplier.insert()
    frappe.db.commit()
    return {'status': 'ok', 'supplier': supplier}