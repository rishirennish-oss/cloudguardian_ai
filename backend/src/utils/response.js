function ok(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data
  });
}

function fail(res, msg, statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    error: msg
  });
}

module.exports = {
  ok,
  fail
};

