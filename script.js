/* -------------------------
  main client-side behaviors
   - reviews slider (simple)
   - faq accordion
   - razorpay checkout trigger (calls server to create order)
--------------------------*/

document.addEventListener('DOMContentLoaded', function () {

  /* Reviews slider: simple auto-scroll */
  (function(){
    const wrap = document.getElementById('reviewsContainer');
    if(!wrap) return;
    let idx = 0;
    const items = wrap.children;
    const total = items.length;
    function show(i){
      const w = items[0].offsetWidth + 12; // gap
      wrap.style.transform = `translateX(${-i * w}px)`;
      wrap.style.transition = 'transform .5s ease';
    }
    document.getElementById('nextReview')?.addEventListener?.('click', ()=>{ idx = (idx+1)%total; show(idx);});
    document.getElementById('prevReview')?.addEventListener?.('click', ()=>{ idx = (idx-1+total)%total; show(idx);});
    let auto = setInterval(()=>{ idx = (idx+1)%total; show(idx); }, 5000);
    wrap.addEventListener('mouseenter', ()=> clearInterval(auto));
    wrap.addEventListener('mouseleave', ()=> auto = setInterval(()=>{ idx = (idx+1)%total; show(idx); }, 5000));
    window.addEventListener('resize', ()=> show(idx));
    show(0);
  })();

  /* FAQ accordion */
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-target');
      const a = document.getElementById(id);
      if(!a) return;
      // close others
      document.querySelectorAll('.faq-a').forEach(x => { if(x !== a) x.style.maxHeight = '0' });
      if(a.style.maxHeight && a.style.maxHeight !== '0px'){
        a.style.maxHeight = '0';
      } else {
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });

  /* Razorpay integration flow:
     - Client calls server endpoint `/create_order` which creates an order via Razorpay server-side SDK and returns { orderId }
     - Then we open Razorpay checkout with that orderId
     - After payment, Razorpay returns payment_id & signature; we send to server /verify_payment to confirm signature & finalize.
  */

  const priceINR = 39; // INR
  const amountPaise = priceINR * 100; // 3900 paise

  async function createOrderOnServer() {
    // Replace endpoint path if different
    const res = await fetch('/create_order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: `AIWB_${Date.now()}`,
        product: 'AI Wealth Blueprint (eBook)'
      })
    });
    if(!res.ok) throw new Error('Order creation failed');
    return res.json(); // expected { orderId: 'order_XXXX', key: 'rzp_test_xxx' }
  }

  function loadRazorpayScript() {
    return new Promise((resolve, reject) => {
      if(window.Razorpay) return resolve(true);
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error('Razorpay SDK failed to load'));
      document.head.appendChild(s);
    });
  }

  async function openCheckout() {
    try {
      await loadRazorpayScript();
      const data = await createOrderOnServer(); // server returns orderId and key_id
      const options = {
        key: data.key || 'rzp_test_YOUR_KEY', // server should return your key_id (or embed here)
        amount: amountPaise,
        currency: 'INR',
        name: 'AI Wealth Blueprint',
        description: '365-day eBook + Templates',
        order_id: data.orderId,
        handler: async function (response){
          // response contains razorpay_payment_id, razorpay_order_id, razorpay_signature
          // verify on server
          const verify = await fetch('/verify_payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response)
          });
          const result = await verify.json();
          if(verify.ok && result.success){
            alert('Payment successful! Check your email for download link.');
            // optionally redirect to thank-you page
            window.location.href = '/thankyou';
          } else {
            alert('Payment verification failed. Contact support.');
          }
        },
        prefill: {
          name: '',
          email: ''
        },
        theme: { color: '#211C84' }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert('Could not open payment gateway. See console for details.');
    }
  }

  document.getElementById('buyBtn')?.addEventListener('click', openCheckout);
  document.getElementById('buyBtn2')?.addEventListener('click', openCheckout);

});
