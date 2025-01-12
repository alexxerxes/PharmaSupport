// استدعاء بيانات Google Apps Script
google.charts.load("current", { packages: ["table"] });
google.charts.setOnLoadCallback(handleData);


function handleData() {
    const spreadsheetId = "1M7WLnM9Dgbz-fzpoJmbW3DSC9Z-apul8qMD0mJjmB1U";
    const range = "Sheet2!G1"; // نطاق الخلية
    const apiKey = "AIzaSyCUAGP16uXTJXugjn8wnjYrCSfyfRcfSns"; // أدخل مفتاح الـ API هنا
  
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
  
    // تحقق من البيانات المخزنة في SessionStorage
    const storedData = sessionStorage.getItem("productDataPS");
    const initialTimePS = sessionStorage.getItem("initialTimePS");
  
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        const currentValue = data.values ? data.values[0][0] : null;
        console.log("الوقت الحالي:", currentValue);
  
        if (!initialTimePS) {
          // إذا لم تكن القيمة الأولية مخزنة، قم بتخزينها
          sessionStorage.setItem("initialTimePS", currentValue);
          console.log("تم تخزين الوقت الأولي:", currentValue);
  
          //  إذا لم تكن البيانات موجودة في SessionStorage، قم بتحميلها من Google Sheets
      var query = new google.visualization.Query(
        "https://docs.google.com/spreadsheets/d/1M7WLnM9Dgbz-fzpoJmbW3DSC9Z-apul8qMD0mJjmB1U/gviz/tq?sheet=Sheet2"
      );
      query.send(handleProductQueryResponse);
        } else {
          console.log("الوقت الأولي المخزن:", initialTimePS);
  
          if (initialTimePS === currentValue && storedData) {
            // إذا كانت القيم متشابهة والبيانات موجودة في التخزين المؤقت
            console.log("القيم متشابهة. عرض البيانات المخزنة.");
            const rows = JSON.parse(storedData);
            initializeDataTable(rows);
          } else {
            // إذا كانت القيم مختلفة أو لا توجد بيانات مخزنة
            console.log("القيم مختلفة. تحديث البيانات من Google Sheets.");
            sessionStorage.setItem("initialTimePS", currentValue); // تحديث الوقت الأولي
            var query = new google.visualization.Query(
              `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?sheet=Sheet2`
            );
            query.send(handleProductQueryResponse);
          }
        }
      })
      .catch((error) => console.error("خطأ في الاستعلام:", error));
  }
  

function handleProductQueryResponse(response) {
  if (response.isError()) {
    console.error(
      "Error in query: " +
        response.getMessage() +
        " " +
        response.getDetailedMessage()
    );
    return;
  }

  var data = response.getDataTable();
  var rows = [];

  // إنشاء الصفوف
  for (var i = 0; i < data.getNumberOfRows(); i++) {
    var row = [];
    for (var j = 0; j < 5; j++) {
      row.push(data.getValue(i, j));
    }
    // إضافة زر الطلب
    row.push(
      "<button class='order-button' onclick='openOrderModal(this)'>طلب</button>"
    );
    rows.push(row);
  }

    // تخزين البيانات في SessionStorage
    sessionStorage.setItem("productDataPS", JSON.stringify(rows));

    // تهيئة DataTables
    initializeDataTable(rows);

}

function initializeDataTable(rows) {
    // تهيئة DataTables
    $(document).ready(function () {
      $("#productTable").DataTable({
        data: rows,
        pageLength: 50,
        order: [[0, "desc"]],
        columns: [
          { title: "ID", visible: false }, // جعل هذا العمود غير مرئي
          { title: "Ex" },
          { title: "الصنف" },
          { title: "الكمية" },
          { title: "السعر" },
          { title: "طلب", orderable: false },
        ],
        language: {
          url: "https://cdn.datatables.net/plug-ins/1.13.6/i18n/ar.json",
        },
      });
    });
  }


// فتح نافذة الطلب
function openOrderModal(button) {
  const productName = button.parentNode.parentNode.cells[1].innerHTML;
  const productPrice = button.parentNode.parentNode.cells[3].innerHTML; // الحصول على السعر
  const productDate = button.parentNode.parentNode.cells[0].innerHTML; // الحصول على التاريخ (تأكد من موقعه الصحيح)

  document.getElementById(
    "modalProductDate"
  ).innerText = `Date: ${productDate}`;
  // تعيين التاريخ في النافذة
  document.getElementById("modalProductName").innerText = productName;
  document.getElementById("orderModal").style.display = "block";
  document.getElementById("overlay").classList.add("show");
  document.getElementById("orderModal").dataset.price = productPrice; // تخزين السعر في بيانات النافذة
}

// إغلاق النافذة
function closeModal() {
  document.getElementById("orderModal").style.display = "none";
  document.getElementById("overlay").classList.remove("show");
}

// إضافة الطلب
function addToOrder() {
  const productDate = document
    .getElementById("modalProductDate")
    .innerText.replace("Date: ", "");
  // افترض أن تاريخ المنتج موجود هنا

  const selectedProduct = document.getElementById("modalProductName").innerText;
  const quantity = parseInt(document.getElementById("quantity").value);
  const price = parseFloat(document.getElementById("orderModal").dataset.price);
  const totalPrice = quantity * price;

  // إضافة الطلب إلى localStorage
  let orders = JSON.parse(localStorage.getItem("orders")) || [];

  let productExists = false;

  // تحقق مما إذا كان المنتج وتاريخه موجودين مسبقًا
  orders = orders.map((order) => {
    if (order.name === selectedProduct && order.date === productDate) {
      // إذا كان المنتج وتاريخه متطابقين، يتم تحديث الكمية والإجمالي
      order.quantity += quantity;
      order.totalPrice = order.quantity * order.price;
      productExists = true;
    }
    return order;
  });

  // إذا لم يكن المنتج بنفس التاريخ موجودًا، أضف طلبًا جديدًا
  if (!productExists) {
    const newOrder = {
      date: productDate, // إضافة تاريخ المنتج للطلب الجديد
      name: selectedProduct,
      quantity: quantity,
      price: price,
      totalPrice: totalPrice,
    };
    orders.push(newOrder);
    addOrderToTable(newOrder);
  } else {
    // تحديث الجدول إذا تم تعديل الكمية
    updateOrderTable(orders);
  }

  localStorage.setItem("orders", JSON.stringify(orders));

  closeModal();
  document.getElementById("orderListTitle").style.display = "";
}

// إضافة الطلب إلى الجدول
function addOrderToTable(order) {
  const orderTable = document
    .getElementById("orderTable")
    .getElementsByTagName("tbody")[0];
  const newRow = orderTable.insertRow(0);

  const dateCell = newRow.insertCell(0);
  const nameCell = newRow.insertCell(1);
  const quantityCell = newRow.insertCell(2);
  const priceCell = newRow.insertCell(3);
  const totalCell = newRow.insertCell(4);
  const actionCell = newRow.insertCell(5);

  dateCell.innerText = order.date;
  nameCell.innerText = order.name;
  quantityCell.innerText = order.quantity;
  if (
    order.price === null ||
    order.price === undefined ||
    order.price === "" ||
    isNaN(order.price)
  ) {
    priceCell.innerText = 0; // أو أي قيمة افتراضية
  } else {
    priceCell.innerText = order.price.toFixed(0);
  }

  //priceCell.innerText = order.price.toFixed(2);
  if (
    order.totalPrice === null ||
    order.price === undefined ||
    order.price === "" ||
    isNaN(order.price)
  ) {
    totalCell.innerText = 0; // أو أي قيمة افتراضية
  } else {
    totalCell.innerText = order.totalPrice.toFixed(0);
  }

  // totalCell.innerText = order.totalPrice.toFixed(2);
  actionCell.innerHTML =
    "<button class='order-button-red' onclick='cancelOrder(this)'>×</button>";

  updateTotal();
}

// الدالة لزيادة الكمية
function increment() {
  let quantityInput = document.getElementById("quantity");
  quantityInput.value = parseInt(quantityInput.value) + 1;
}

// الدالة لنقص الكمية
function decrement() {
  let quantityInput = document.getElementById("quantity");
  if (quantityInput.value > 1) {
    quantityInput.value = parseInt(quantityInput.value) - 1;
  }
}

// تحديث الجدول إذا تم تعديل الكمية
function updateOrderTable(orders) {
  const orderTable = document
    .getElementById("orderTable")
    .getElementsByTagName("tbody")[0];
  orderTable.innerHTML = ""; // مسح الجدول

  // إعادة إضافة الطلبات المحدثة إلى الجدول
  orders.forEach((order) => {
    addOrderToTable(order);
  });
}

// تحميل الطلبات المحفوظة عند تحميل الصفحة
window.onload = function () {
  loadOrders();
};

// تحميل الطلبات من localStorage
function loadOrders() {
  const orders = JSON.parse(localStorage.getItem("orders")) || [];
  if (orders.length > 0) {
    document.getElementById("orderListTitle").style.display = "";

    orders.forEach((order) => addOrderToTable(order));
  }
}

// إلغاء الطلب
function cancelOrder(button) {
  const row = button.parentNode.parentNode;
  const productName = row.cells[1].innerText;

  // حذف الطلب من الجدول
  row.parentNode.removeChild(row);

  // حذف الطلب من localStorage
  let orders = JSON.parse(localStorage.getItem("orders")) || [];
  orders = orders.filter((order) => order.name !== productName);
  localStorage.setItem("orders", JSON.stringify(orders));

  // إخفاء الجدول إذا لم يكن هناك طلبات
  if (orders.length === 0) {
    document.getElementById("orderListTitle").style.display = "none";
  } else {
    updateTotal();
  }
}

function cancelAllOrders() {
  const orderTable = document
    .getElementById("orderTable")
    .getElementsByTagName("tbody")[0];

  // حذف جميع الصفوف
  while (orderTable.rows.length > 0) {
    orderTable.deleteRow(0);
  }

  // حذف البيانات من localStorage
  localStorage.removeItem("orders");

  // اخفاء جدول الطلبات
  document.getElementById("orderListTitle").style.display = "none";

  /* عدد الطلبات في السلة */ document.getElementById("cart-count").textContent =
    orderTable.rows.length;
}

// دالة لحساب الإجمالي
function updateTotal() {
  const orderTable = document
    .getElementById("orderTable")
    .getElementsByTagName("tbody")[0];
  const rows = orderTable.getElementsByTagName("tr");
  let totalSum = 0;

  // جمع جميع القيم في عمود الإجمالي
  for (let row of rows) {
    const totalCell = row.cells[4]; // إجمالي السعر في العمود الخامس
    if (totalCell) {
      totalSum += parseFloat(totalCell.innerText); // إضافة قيمة كل صف إلى المجموع
    }
  }

  // تحديث أو إضافة صف الإجمالي
  let totalRow = document.getElementById("totalRow");
  if (!totalRow) {
    // إذا لم يكن هناك صف إجمالي، أنشئ صفاً جديداً
    totalRow = document.createElement("tr");
    totalRow.id = "totalRow";

    const totalLabelCell = document.createElement("td");
    totalLabelCell.colSpan = 4; // دمج 4 خلايا لتكون صف الإجمالي
    totalLabelCell.innerText = "الإجمالي:";
    totalRow.appendChild(totalLabelCell);

    const totalAmountCell = document.createElement("td");
    totalAmountCell.id = "totalAmount";
    totalAmountCell.innerText = totalSum.toFixed(2);
    totalRow.appendChild(totalAmountCell);

    orderTable.appendChild(totalRow);
  } else {
    // إذا كان الصف الإجمالي موجودًا، حدّث قيمته
    const totalAmountCell = document.getElementById("totalAmount");
    if (totalAmountCell) {
      totalAmountCell.innerText = totalSum.toFixed(2);
    }
  }

  /* عدد الطلبات في السلة */ document.getElementById("cart-count").textContent =
    rows.length - 1;
}

// ارسال الطلبات عبر الواتس
function sendOrderViaWhatsApp() {
  let orders = JSON.parse(localStorage.getItem("orders")) || [];

  if (orders.length === 0) {
    alert("لا يوجد طلبات لإرسالها.");
    return;
  }

  // let message = 'تفاصيل الطلب:\n';
  // orders.forEach(order => {
  //     // message += `المنتج: ${order.name}, الكمية: ${order.quantity}, السعر: ${order.price.toFixed(2)}, الإجمالي: ${order.totalPrice.toFixed(2)}\n`;
  //     message += `المنتج: ${order.name}, الكمية: ${order.quantity}, السعر: ${(order.price !== null && order.price !== undefined) ? order.price.toFixed(2) : 'N/A'}, الإجمالي: ${(order.totalPrice !== null && order.totalPrice !== undefined) ? order.totalPrice.toFixed(2) : 'N/A'}\n`;

  // });
  let message = "الاسم      | الكمية | السعر  | الإجمالي \n";
  message += "--------------------------------------------\n";

  orders.forEach((order) => {
    let price = parseFloat(order.price).toString(); // حذف الأصفار غير الضرورية
    let totalPrice = parseFloat(order.totalPrice).toString(); // حذف الأصفار غير الضرورية
    message += `${order.name.padEnd(10)} | ${order.quantity
      .toString()
      .padEnd(6)} | ${price.padEnd(7)} | ${totalPrice.padEnd(7)}\n`;
  });

  // حساب الإجمالي النهائي
  let totalSum = orders.reduce((sum, order) => sum + order.totalPrice, 0);
  message += `\nالإجمالي الكلي: ${totalSum.toFixed(2)} ريال`;

  // تحويل النص إلى URI
  const encodedMessage = encodeURIComponent(message);
  const whatsappNumber = "770963942"; // قم بإضافة رقمك بدون علامة +

  // بناء رابط الواتساب
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

  // فتح رابط الواتساب
  window.open(whatsappLink, "_blank");
}

/* عند الضغط على السلة يمرر الى جدول الطلبات*/
document.getElementById("cartButton").addEventListener("click", function () {
  const orderTable = document.getElementById("orderTable");
  orderTable.scrollIntoView({ behavior: "smooth" });
});
