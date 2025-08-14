web: APP_DATA_DIR=/opt/render/project/src/data \
     UPLOAD_DIR=/opt/render/project/src/data/img \
     WKHTMLTOPDF_CMD=/opt/render/project/src/vendor/wkhtmltox/usr/local/bin/wkhtmltopdf \
     LD_LIBRARY_PATH=/opt/render/project/src/vendor/wkhtmltox/usr/local/lib:$LD_LIBRARY_PATH \
     gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 120
