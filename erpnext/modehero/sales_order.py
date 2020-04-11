import frappe
import json


@frappe.whitelist()
def create_sales_order(items, garmentlabel, internalref):
    prepared = []
    items = json.loads(items)
    for i in items:
        prepared.append({
            "item_name": items[i]['item'],
            "item_code": items[i]['item'],
            "qty": 1,
            "rate": 1,
            "warehouse": "",
            "uom": "pcs",
            "conversion_factor": 1,
            "item_destination": items[i]['destination']
        })

    order = frappe.get_doc(
        {"doctype": "Sales Order",
         #  "name": "3",
         "internal_ref": internalref,
         "customer": "Customer 1",
         "company": "Brand 1",
         "conversion_rate": 1,
         "plc_conversion_rate": 1,
         "garment_label": garmentlabel,
         "items": prepared,
            "price_list_currency": "USD",
         })

    order.insert()

    for i in order.items:
        quantities = items[i.item_name]['quantities']
        for s in quantities:
            qty = quantities[s]

            # qtypersize = frappe.new_doc('Quantity Per Size')
            if qty != '':
                qtypersize = frappe.get_doc({
                    "doctype": "Quantity Per Size",
                    "name": i.name,
                    "size": s,
                    "quantity": qty,
                    "order_id": i.name
                })
            qtypersize.insert()

    frappe.db.commit()

    return {'status': 'ok', 'order': order}


def on_remove_sales_order_item(doc, method):
    for i in doc.items:
        docs = frappe.get_list("Quantity Per Size",
                               filters={"order_id": i.name})
        for j in docs:
            doc = frappe.delete_doc("Quantity Per Size", j.name)

    frappe.msgprint("Sales order "+doc.name + " deleted")
