from django.db.models import ImageField
from django.core.validators import FileExtensionValidator

EXTENSIONS = ['jpeg', 'jpg', 'png', 'gif', '']

validate_image_file_extension = FileExtensionValidator(
    allowed_extensions=[ext.lower() for ext in EXTENSIONS],
)

class MyImageField(ImageField):

    default_validators = [validate_image_file_extension]
