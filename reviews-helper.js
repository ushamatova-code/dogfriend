function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

async function loadReviews(businessId){
 if(!supabaseClient) return [];
 try{
  const {data,error}=await supabaseClient.from('reviews').select('*').eq('business_id',businessId).order('created_at',{ascending:false});
  if(error) throw error;
  return data||[];
 }catch(e){console.error('loadReviews error:',e);return[];}
}
